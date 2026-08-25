import { useEffect, useState } from "react";

import "./styles.css";

import api from "./api";

import {
  Asset,
  Space,
  User,
} from "./types";

import {
  getLocalFile,
  hasLocalFile,
  makeThumbnail,
  saveLocalFile,
  sha256,
} from "./localAssets";

type Screen =
  | "login"
  | "home"
  | "space";

function App() {
  const [user, setUser] =
    useState<User | null>(null);

  const [screen, setScreen] =
    useState<Screen>("login");

  const [spaces, setSpaces] =
    useState<Space[]>([]);

  const [space, setSpace] =
    useState<Space | null>(null);

  const [assets, setAssets] =
    useState<Asset[]>([]);

  /*
   * Contains Django asset IDs for which
   * the ORIGINAL file exists locally.
   */
  const [localAssetIds, setLocalAssetIds] =
    useState<Set<string>>(new Set());

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [displayName, setDisplayName] =
    useState("");

  const [isRegister, setIsRegister] =
    useState(true);

  const [spaceName, setSpaceName] =
    useState("");

  const [error, setError] =
    useState("");

  const [busy, setBusy] =
    useState(false);

  /*
   * Restore login after browser refresh.
   */
  useEffect(() => {
    const token =
      localStorage.getItem(
        "tripshare_token",
      );

    if (!token) {
      return;
    }

    api.get<User>("/auth/me/")
      .then((response) => {
        setUser(response.data);
        setScreen("home");

        void loadSpaces();
      })
      .catch(() => {
        localStorage.removeItem(
          "tripshare_token",
        );
      });
  }, []);

  async function loadSpaces() {
    try {
      const response =
        await api.get<Space[]>(
          "/spaces/",
        );

      setSpaces(response.data);
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ??
          "Could not load spaces.",
      );
    }
  }

  /*
   * Register / login.
   */
  async function authenticate() {
    setBusy(true);
    setError("");

    try {
      const endpoint =
        isRegister
          ? "/auth/register/"
          : "/auth/login/";

      const payload = isRegister
        ? {
            email,
            password,
            display_name:
              displayName,
          }
        : {
            email,
            password,
          };

      const response =
        await api.post(
          endpoint,
          payload,
        );

      localStorage.setItem(
        "tripshare_token",
        response.data.token,
      );

      setUser(response.data.user);
      setScreen("home");

      await loadSpaces();
    } catch (err: any) {
      setError(
        JSON.stringify(
          err?.response?.data ??
            "Authentication failed.",
        ),
      );
    } finally {
      setBusy(false);
    }
  }

  /*
   * Create a shared space.
   */
  async function createSpace() {
    const name =
      spaceName.trim();

    if (!name) {
      return;
    }

    setBusy(true);
    setError("");

    try {
      const response =
        await api.post<Space>(
          "/spaces/",
          {
            name,
          },
        );

      setSpaces((current) => [
        response.data,
        ...current,
      ]);

      setSpace(response.data);
      setAssets([]);

      setLocalAssetIds(
        new Set(),
      );

      setSpaceName("");
      setScreen("space");
    } catch (err: any) {
      setError(
        JSON.stringify(
          err?.response?.data ??
            "Could not create space.",
        ),
      );
    } finally {
      setBusy(false);
    }
  }

  /*
   * Open a shared space.
   */
  async function openSpace(
    spaceId: string,
  ) {
    setBusy(true);
    setError("");

    try {
      const [
        spaceResponse,
        assetsResponse,
      ] = await Promise.all([
        api.get<Space>(
          `/spaces/${spaceId}/`,
        ),

        api.get<Asset[]>(
          `/assets/spaces/${spaceId}/`,
        ),
      ]);

      setSpace(
        spaceResponse.data,
      );

      setAssets(
        assetsResponse.data,
      );

      await refreshLocalAvailability(
        assetsResponse.data,
      );

      setScreen("space");
    } catch (err: any) {
      setError(
        JSON.stringify(
          err?.response?.data ??
            "Could not open space.",
        ),
      );
    } finally {
      setBusy(false);
    }
  }

  /*
   * Check which shared originals
   * exist on this device.
   */
  async function refreshLocalAvailability(
    assetList: Asset[],
  ) {
    const results =
      await Promise.all(
        assetList.map(
          async (asset) => {
            const exists =
              await hasLocalFile(
                asset.id,
              );

            return exists
              ? asset.id
              : null;
          },
        ),
      );

    const ids =
      results.filter(
        (
          id,
        ): id is string =>
          id !== null,
      );

    setLocalAssetIds(
      new Set(ids),
    );
  }

  /*
   * Refresh gallery.
   */
  async function refreshAssets() {
    if (!space) {
      return;
    }

    const response =
      await api.get<Asset[]>(
        `/assets/spaces/${space.id}/`,
      );

    setAssets(response.data);

    await refreshLocalAvailability(
      response.data,
    );
  }

  /*
   * Select photos from the device.
   *
   * IMPORTANT:
   *
   * The original is NEVER added to FormData.
   *
   * Only:
   *   - metadata
   *   - checksum
   *   - thumbnail
   *
   * are sent to Django.
   */
  async function publishPhotos(
    selectedFiles:
      FileList | null,
  ) {
    if (
      !selectedFiles ||
      !space
    ) {
      return;
    }

    const files =
      Array.from(selectedFiles);

    if (files.length === 0) {
      return;
    }

    setBusy(true);
    setError("");

    try {
      for (const file of files) {
        if (
          !file.type.startsWith(
            "image/",
          )
        ) {
          continue;
        }

        /*
         * Generate thumbnail locally.
         */
        const thumbnail =
          await makeThumbnail(
            file,
          );

        /*
         * Calculate checksum locally.
         */
        const checksum =
          await sha256(file);

        /*
         * Read image dimensions.
         */
        const image =
          await createImageBitmap(
            file,
          );

        const form =
          new FormData();

        form.append(
          "original_filename",
          file.name,
        );

        form.append(
          "mime_type",
          file.type ||
            "application/octet-stream",
        );

        form.append(
          "size_bytes",
          String(file.size),
        );

        form.append(
          "checksum",
          checksum,
        );

        form.append(
          "width",
          String(image.width),
        );

        form.append(
          "height",
          String(image.height),
        );

        /*
         * ONLY thumbnail goes to Django.
         */
        form.append(
          "thumbnail",
          thumbnail,
          "thumbnail.jpg",
        );

        /*
         * IMPORTANT:
         *
         * We DO NOT do:
         *
         * form.append("file", file)
         *
         * Therefore the original stays local.
         */
        const response =
          await api.post<Asset>(
            `/assets/spaces/${space.id}/`,
            form,
          );

        image.close();

        /*
         * Django now gives us the
         * authoritative asset ID.
         *
         * Save the ORIGINAL using
         * Django's asset ID.
         *
         * This fixes the previous ID mismatch.
         */
        await saveLocalFile(
          response.data.id,
          file,
        );
      }

      await refreshAssets();
    } catch (err: any) {
      setError(
        JSON.stringify(
          err?.response?.data ??
            "Photo publishing failed.",
        ),
      );
    } finally {
      setBusy(false);
    }
  }

  /*
   * Download/open an original that
   * exists locally.
   */
  async function downloadOriginal(
    asset: Asset,
  ) {
    const available =
      localAssetIds.has(
        asset.id,
      );

    if (!available) {
      alert(
        "This original is on the owner's device. " +
          "P2P transfer will be added next.",
      );

      return;
    }

    const file =
      await getLocalFile(
        asset.id,
      );

    if (!file) {
      setLocalAssetIds(
        (current) => {
          const next =
            new Set(current);

          next.delete(
            asset.id,
          );

          return next;
        },
      );

      alert(
        "The original is no longer available locally.",
      );

      return;
    }

    const url =
      URL.createObjectURL(
        file,
      );

    const anchor =
      document.createElement(
        "a",
      );

    anchor.href = url;
    anchor.download =
      file.name;

    document.body.appendChild(
      anchor,
    );

    anchor.click();
    anchor.remove();

    setTimeout(() => {
      URL.revokeObjectURL(
        url,
      );
    }, 60_000);
  }

  function logout() {
    localStorage.removeItem(
      "tripshare_token",
    );

    setUser(null);
    setSpace(null);
    setSpaces([]);
    setAssets([]);

    setLocalAssetIds(
      new Set(),
    );

    setScreen("login");
  }

  /*
   * LOGIN
   */
  if (
    !user ||
    screen === "login"
  ) {
    return (
      <div className="page center">
        <div className="card auth">
          <h1>
            TripShare
          </h1>

          <p>
            Share original photos
            without automatically
            uploading them.
          </p>

          {isRegister && (
            <input
              placeholder="Display name"
              value={
                displayName
              }
              onChange={(event) =>
                setDisplayName(
                  event.target
                    .value,
                )
              }
            />
          )}

          <input
            placeholder="Email"
            type="email"
            value={email}
            onChange={(event) =>
              setEmail(
                event.target
                  .value,
              )
            }
          />

          <input
            placeholder="Password"
            type="password"
            value={password}
            onChange={(event) =>
              setPassword(
                event.target
                  .value,
              )
            }
          />

          <button
            disabled={busy}
            onClick={() =>
              void authenticate()
            }
          >
            {busy
              ? "Please wait..."
              : isRegister
                ? "Create account"
                : "Login"}
          </button>

          <button
            className="secondary"
            onClick={() =>
              setIsRegister(
                (current) =>
                  !current,
              )
            }
          >
            {isRegister
              ? "I already have an account"
              : "Create a new account"}
          </button>

          {error && (
            <p className="error">
              {error}
            </p>
          )}
        </div>
      </div>
    );
  }

  /*
   * HOME
   */
  if (
    screen === "home"
  ) {
    return (
      <div className="page">
        <header className="topbar dashboard-header">
          <div className="brand">
            <div className="brand-icon">
              📸
            </div>

            <div>
              <strong>TripShare</strong>
              <span>Private photo sharing</span>
            </div>
          </div>

          <div className="topbar-right">
            <div className="user-info">
              <div className="avatar">
                {(user.display_name || user.email || "U")[0].toUpperCase()}
              </div>

              <span>
                {user.display_name || user.email}
              </span>
            </div>

            <button
              className="secondary small-button"
              onClick={logout}
            >
              Logout
            </button>
          </div>
        </header>

        <main className="dashboard-content">
          <section className="welcome-section">
            <div>
              <p className="eyebrow">YOUR SHARED SPACES</p>
              <h1>Your trips</h1>
              <p className="dashboard-description">
                Create a private space and share photos with your friends.
              </p>
            </div>

            <div className="create-space-box">
              <input
                placeholder="Trip name..."
                value={spaceName}
                onChange={(event) =>
                  setSpaceName(event.target.value)
                }
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    void createSpace();
                  }
                }}
              />

              <button
                disabled={busy}
                onClick={() => void createSpace()}
              >
                + Create trip
              </button>
            </div>
          </section>

          {error && <p className="error">{error}</p>}

          {spaces.length > 0 ? (
            <section className="spaces-section">
              <div className="section-heading">
                <h2>Your shared trips</h2>
                <span>
                  {spaces.length} {spaces.length === 1 ? "trip" : "trips"}
                </span>
              </div>

              <div className="space-grid">
                {spaces.map((item) => (
                  <article className="space-card-new" key={item.id}>
                    <div className="space-cover">
                      <span className="trip-icon">🏔️</span>
                      <span className="space-status">PRIVATE</span>
                    </div>

                    <div className="space-card-body">
                      <h3>{item.name}</h3>

                      <div className="space-meta">
                        <span>
                          👥 {item.members.length} {item.members.length === 1 ? "member" : "members"}
                        </span>
                        <span>🔒 Private</span>
                      </div>

                      <button
                        className="open-space-button"
                        onClick={() => void openSpace(item.id)}
                      >
                        <span>Open trip</span>
                        <span>→</span>
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ) : (
            <section className="empty-dashboard">
              <div className="empty-icon">📸</div>
              <h2>No trips yet</h2>
              <p>
                Create your first trip to start sharing photos with your friends.
              </p>
              <button
                onClick={() => {
                  const input = document.querySelector(
                    ".create-space-box input",
                  ) as HTMLInputElement | null;

                  input?.focus();
                }}
              >
                Create your first trip
              </button>
            </section>
          )}
        </main>
      </div>
    );
  }

  /*
   * SHARED SPACE
   */
  return (
    <div className="page">
      <header className="topbar">
        <button
          className="secondary"
          onClick={() =>
            setScreen(
              "home",
            )
          }
        >
          ← Back
        </button>

        <strong>
          {space?.name}
        </strong>

        <span>
          {space?.members.length ??
            0}{" "}
          members
        </span>
      </header>

      <main className="content">
        <div className="share-bar">
          <label className="upload-button">
            {busy
              ? "Publishing..."
              : "＋ Select photos"}

            <input
              type="file"
              accept="image/*"
              multiple
              hidden
              disabled={busy}
              onChange={(
                event,
              ) => {
                void publishPhotos(
                  event.target
                    .files,
                );

                /*
                 * Allow selecting
                 * the same photo
                 * again later.
                 */
                event.currentTarget.value =
                  "";
              }}
            />
          </label>
        </div>

        <div className="info-banner">
          <strong>
            Local-first sharing
          </strong>

          <span>
            Originals stay on
            your device.
            Only thumbnails
            and metadata are
            shared with the
            server.
          </span>
        </div>

        {error && (
          <p className="error">
            {error}
          </p>
        )}

        <div className="gallery">
          {assets.map(
            (asset) => {
              const isLocal =
                localAssetIds.has(
                  asset.id,
                );

              return (
                <button
                  className="photo-card"
                  key={
                    asset.id
                  }
                  onClick={() =>
                    void downloadOriginal(
                      asset,
                    )
                  }
                >
                  {asset.thumbnail_url ? (
                    <img
                      src={
                        asset.thumbnail_url
                      }
                      alt={
                        asset.original_filename
                      }
                    />
                  ) : (
                    <div className="placeholder">
                      No preview
                    </div>
                  )}

                  <div className="photo-info">
                    <strong>
                      {asset.owner_name ||
                        asset.owner.slice(
                          0,
                          8,
                        )}
                    </strong>

                    <span>
                      {
                        asset.original_filename
                      }
                    </span>

                    <span
                      className={
                        isLocal
                          ? "availability local"
                          : "availability remote"
                      }
                    >
                      {isLocal
                        ? "🟢 Original on this device"
                        : "🟡 Original on owner's device"}
                    </span>
                  </div>
                </button>
              );
            },
          )}
        </div>

        {assets.length ===
          0 && (
          <div className="empty">
            <h3>
              No shared photos yet
            </h3>

            <p>
              Select photos
              above. Originals
              stay on your
              device.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;