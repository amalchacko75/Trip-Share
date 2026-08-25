export type User = {
  id: string;
  email: string;
  display_name: string;
};

export type Member = {
  id: string;
  user_id: string;
  email: string;
  display_name: string;
  role: "OWNER" | "ADMIN" | "MEMBER";
};

export type Space = {
  id: string;
  name: string;
  description: string;
  created_by: string;
  members: Member[];
};

export type Asset = {
  id: string;
  space: string;
  owner: string;
  owner_name: string;
  original_filename: string;
  mime_type: string;
  size_bytes: number;
  checksum: string;
  width: number | null;
  height: number | null;
  thumbnail_url: string | null;
  source_mode: "LOCAL" | "ONLINE" | "P2P";
  created_at: string;
};
