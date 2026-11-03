export type JobStatus =
  | "queued"
  | "analyzing"
  | "downloading"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled";

export type TaskType = "download" | "trim" | "audio_extract" | "convert";

export interface Job {
  id: string;
  title: string;
  source: string;
  task_type: TaskType;
  status: JobStatus;
  progress: number;
  error?: string | null;
  output_filename?: string | null;
  output_path?: string | null;
  output_size?: number | null;
  created_at: string;
  completed_at?: string | null;
  meta?: Record<string, any>;
}

export interface JobStats {
  queued: number;
  analyzing: number;
  downloading: number;
  processing: number;
  completed: number;
  failed: number;
  cancelled: number;
  total: number;
  active: number;
}

export interface MediaItem {
  id: string;
  filename: string;
  filepath: string;
  file_size: number;
  duration: number;
  format_name: string;
  media_type: "video" | "audio";
  width?: number | null;
  height?: number | null;
  video_codec?: string | null;
  audio_codec?: string | null;
  thumbnail_path?: string | null;
  source_job_id?: string | null;
  created_at: string;
}

export interface StorageStats {
  disk_total_bytes: number;
  disk_used_bytes: number;
  disk_free_bytes: number;
  media_size_bytes: number;
  media_count: number;
  media_dir: string;
}

export interface SystemHealth {
  status: "healthy" | "degraded";
  app_name: string;
  version: string;
  uptime_seconds: number;
  python_version: string;
  ffmpeg: {
    ffmpeg_available: boolean;
    ffmpeg_path: string;
    ffmpeg_version?: string | null;
    ffprobe_available: boolean;
    ffprobe_path: string;
    ffprobe_version?: string | null;
  };
  storage: StorageStats;
  jobs: JobStats;
}

export interface QualityOption {
  id: string;
  label: string;
  resolution?: string;
  ext: string;
  filesize?: number | null;
}

export interface UrlAnalysis {
  supported: boolean;
  is_direct?: boolean;
  title?: string;
  url: string;
  source_type?: string;
  thumbnail?: string | null;
  duration?: number;
  file_size?: number | null;
  qualities?: QualityOption[];
  error?: string | null;
  is_restricted?: boolean;
}
