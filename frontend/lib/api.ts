import {
  SystemHealth,
  UrlAnalysis,
  Job,
  JobStats,
  MediaItem,
} from "@/types";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "/api";

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${BASE_URL}${endpoint}`;
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errMsg = `Request failed: ${response.statusText}`;
    try {
      const errData = await response.json();
      errMsg = errData.detail || errData.message || errMsg;
    } catch {
      // ignore
    }
    throw new Error(errMsg);
  }

  return response.json();
}

export const api = {
  // Health
  getHealth: () => request<SystemHealth>("/health"),

  // Downloads
  analyzeUrl: (url: string) =>
    request<UrlAnalysis>("/downloads/analyze", {
      method: "POST",
      body: JSON.stringify({ url }),
    }),

  startDownload: (data: {
    url: string;
    quality: string;
    format_ext: string;
    title?: string;
  }) =>
    request<{ success: boolean; job_id: string; title: string }>("/downloads/start", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Media
  uploadFile: async (file: File): Promise<{ success: boolean; media: MediaItem }> => {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(`${BASE_URL}/media/upload`, {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      let msg = "Upload failed";
      try {
        const d = await res.json();
        msg = d.detail || msg;
      } catch {
        // ignore
      }
      throw new Error(msg);
    }
    return res.json();
  },

  listMedia: (params?: {
    media_type?: string;
    search?: string;
    sort_by?: string;
    limit?: number;
    offset?: number;
  }) => {
    const q = new URLSearchParams();
    if (params?.media_type && params.media_type !== "all") q.set("media_type", params.media_type);
    if (params?.search) q.set("search", params.search);
    if (params?.sort_by) q.set("sort_by", params.sort_by);
    if (params?.limit) q.set("limit", String(params.limit));
    if (params?.offset) q.set("offset", String(params.offset));
    return request<{ items: MediaItem[]; count: number }>(`/media?${q.toString()}`);
  },

  getMedia: (id: string) => request<MediaItem>(`/media/${id}`),

  syncMedia: () =>
    request<{ success: boolean; items: MediaItem[]; count: number }>("/media/sync", {
      method: "POST",
    }),

  renameMedia: (id: string, new_filename: string) =>
    request<{ success: boolean; media: MediaItem }>(`/media/${id}/rename`, {
      method: "POST",
      body: JSON.stringify({ new_filename }),
    }),

  deleteMedia: (id: string) =>
    request<{ success: boolean }>(`/media/${id}`, {
      method: "DELETE",
    }),

  getStreamUrl: (id: string) => `${BASE_URL}/media/stream/${id}`,
  getDownloadUrl: (id: string) => `${BASE_URL}/media/download/${id}`,

  // Jobs
  listJobs: (params?: {
    status?: string;
    task_type?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }) => {
    const q = new URLSearchParams();
    if (params?.status) q.set("status", params.status);
    if (params?.task_type) q.set("task_type", params.task_type);
    if (params?.search) q.set("search", params.search);
    if (params?.limit) q.set("limit", String(params.limit));
    if (params?.offset) q.set("offset", String(params.offset));
    return request<{ jobs: Job[]; count: number }>(`/jobs?${q.toString()}`);
  },

  getJobStats: () => request<JobStats>("/jobs/stats"),

  getJob: (id: string) => request<Job>(`/jobs/${id}`),

  cancelJob: (id: string) =>
    request<{ success: boolean; message: string }>(`/jobs/${id}/cancel`, {
      method: "POST",
    }),

  deleteJob: (id: string) =>
    request<{ success: boolean }>(`/jobs/${id}`, {
      method: "DELETE",
    }),

  queueAudioExtract: (data: {
    media_id?: string;
    file_path?: string;
    output_format: string;
    bitrate: string;
    copy_codec?: boolean;
  }) =>
    request<{ success: boolean; job_id: string; title: string }>("/jobs/audio-extract", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  queueVideoTrim: (data: {
    media_id?: string;
    file_path?: string;
    start_time: string;
    end_time: string;
    output_format?: string;
    mute_audio?: boolean;
    resolution?: string;
    rotation?: number;
    aspect_ratio?: string;
    framerate?: number;
    crf?: number;
  }) =>
    request<{ success: boolean; job_id: string; title: string }>("/jobs/trim", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  queueFormatConvert: (data: {
    media_id?: string;
    file_path?: string;
    output_format: string;
    custom_filename?: string;
    video_codec?: string;
    audio_codec?: string;
    resolution?: string;
    audio_bitrate?: string;
    crf?: number;
  }) =>
    request<{ success: boolean; job_id: string; title: string }>("/jobs/convert", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Settings
  getSettings: () => request<{ settings: any; capabilities: any }>("/settings"),

  updateSettings: (data: any) =>
    request<{ success: boolean; settings: any }>("/settings", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  cleanupTemp: () =>
    request<{ success: boolean; cleaned_files: number }>("/settings/cleanup-temp", {
      method: "POST",
    }),
};
