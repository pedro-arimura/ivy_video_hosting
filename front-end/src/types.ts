export interface User {
  id: string;
  email: string;
}

export interface Video {
  id: string;
  title: string;
  description: string;
  filename: string;
  size_bytes: number;
  content_type: string;
  created_at: string;
  owner: User;
  is_mine?: boolean;
}
