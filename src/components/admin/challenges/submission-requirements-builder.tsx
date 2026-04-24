"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { SubmissionRequirements } from "@/lib/challenges/types";

export type SubmissionRequirementsBuilderProps = {
  value: SubmissionRequirements;
  onChange: (v: SubmissionRequirements) => void;
};

const DEFAULT_NATIVE_VIDEO = {
  required: false,
  max_duration_sec: 60,
  max_size_mb: 500,
  formats: ["mp4"] as ("mp4")[],
};

const DEFAULT_YOUTUBE_URL = {
  required: false,
};

const DEFAULT_IMAGE = {
  required: false,
  max_count: 5,
  max_size_mb_each: 10,
  formats: ["jpg", "png"] as ("jpg" | "png")[],
};

const DEFAULT_PDF = {
  required: false,
  max_size_mb: 20,
};

export function SubmissionRequirementsBuilder({
  value,
  onChange,
}: SubmissionRequirementsBuilderProps) {
  const nativeVideoChecked = value.native_video !== undefined;
  const youtubeUrlChecked = value.youtube_url !== undefined;
  const imageChecked = value.image !== undefined;
  const pdfChecked = value.pdf !== undefined;

  function toggleNativeVideo(checked: boolean) {
    if (checked) {
      onChange({ ...value, native_video: DEFAULT_NATIVE_VIDEO });
    } else {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { native_video: _nv, ...rest } = value;
      onChange(rest);
    }
  }

  function toggleYoutubeUrl(checked: boolean) {
    if (checked) {
      onChange({ ...value, youtube_url: DEFAULT_YOUTUBE_URL });
    } else {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { youtube_url: _yu, ...rest } = value;
      onChange(rest);
    }
  }

  function toggleImage(checked: boolean) {
    if (checked) {
      onChange({ ...value, image: DEFAULT_IMAGE });
    } else {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { image: _img, ...rest } = value;
      onChange(rest);
    }
  }

  function togglePdf(checked: boolean) {
    if (checked) {
      onChange({ ...value, pdf: DEFAULT_PDF });
    } else {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { pdf: _pdf, ...rest } = value;
      onChange(rest);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm font-medium">작품 업로드 요건</p>

      {/* native_video */}
      <div className="space-y-3 rounded-lg border border-border p-4">
        <div className="flex items-center gap-3">
          <Checkbox
            id="req-native-video"
            checked={nativeVideoChecked}
            onCheckedChange={(checked) => toggleNativeVideo(checked === true)}
          />
          <Label htmlFor="req-native-video" className="cursor-pointer">
            영상 (native_video)
          </Label>
        </div>
        {nativeVideoChecked && value.native_video && (
          <div className="ml-7 space-y-3">
            <div className="flex items-center gap-3">
              <Switch
                id="req-native-video-required"
                checked={value.native_video.required}
                onCheckedChange={(checked) =>
                  onChange({
                    ...value,
                    native_video: { ...value.native_video!, required: checked },
                  })
                }
              />
              <Label htmlFor="req-native-video-required">필수</Label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="req-native-video-duration" className="text-xs text-muted-foreground">
                  최대 길이 (초)
                </Label>
                <Input
                  id="req-native-video-duration"
                  type="number"
                  min={1}
                  value={value.native_video.max_duration_sec}
                  onChange={(e) =>
                    onChange({
                      ...value,
                      native_video: {
                        ...value.native_video!,
                        max_duration_sec: Number(e.target.value),
                      },
                    })
                  }
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="req-native-video-size" className="text-xs text-muted-foreground">
                  최대 용량 (MB)
                </Label>
                <Input
                  id="req-native-video-size"
                  type="number"
                  min={1}
                  value={value.native_video.max_size_mb}
                  onChange={(e) =>
                    onChange({
                      ...value,
                      native_video: {
                        ...value.native_video!,
                        max_size_mb: Number(e.target.value),
                      },
                    })
                  }
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">형식: mp4</p>
          </div>
        )}
      </div>

      {/* youtube_url */}
      <div className="space-y-3 rounded-lg border border-border p-4">
        <div className="flex items-center gap-3">
          <Checkbox
            id="req-youtube-url"
            checked={youtubeUrlChecked}
            onCheckedChange={(checked) => toggleYoutubeUrl(checked === true)}
          />
          <Label htmlFor="req-youtube-url" className="cursor-pointer">
            YouTube URL
          </Label>
        </div>
        {youtubeUrlChecked && value.youtube_url && (
          <div className="ml-7">
            <div className="flex items-center gap-3">
              <Switch
                id="req-youtube-url-required"
                checked={value.youtube_url.required}
                onCheckedChange={(checked) =>
                  onChange({
                    ...value,
                    youtube_url: { required: checked },
                  })
                }
              />
              <Label htmlFor="req-youtube-url-required">필수</Label>
            </div>
          </div>
        )}
      </div>

      {/* image */}
      <div className="space-y-3 rounded-lg border border-border p-4">
        <div className="flex items-center gap-3">
          <Checkbox
            id="req-image"
            checked={imageChecked}
            onCheckedChange={(checked) => toggleImage(checked === true)}
          />
          <Label htmlFor="req-image" className="cursor-pointer">
            이미지
          </Label>
        </div>
        {imageChecked && value.image && (
          <div className="ml-7 space-y-3">
            <div className="flex items-center gap-3">
              <Switch
                id="req-image-required"
                checked={value.image.required}
                onCheckedChange={(checked) =>
                  onChange({
                    ...value,
                    image: { ...value.image!, required: checked },
                  })
                }
              />
              <Label htmlFor="req-image-required">필수</Label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="req-image-count" className="text-xs text-muted-foreground">
                  최대 개수
                </Label>
                <Input
                  id="req-image-count"
                  type="number"
                  min={1}
                  value={value.image.max_count}
                  onChange={(e) =>
                    onChange({
                      ...value,
                      image: {
                        ...value.image!,
                        max_count: Number(e.target.value),
                      },
                    })
                  }
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="req-image-size" className="text-xs text-muted-foreground">
                  파일당 최대 용량 (MB)
                </Label>
                <Input
                  id="req-image-size"
                  type="number"
                  min={1}
                  value={value.image.max_size_mb_each}
                  onChange={(e) =>
                    onChange({
                      ...value,
                      image: {
                        ...value.image!,
                        max_size_mb_each: Number(e.target.value),
                      },
                    })
                  }
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">형식: jpg, png</p>
          </div>
        )}
      </div>

      {/* pdf */}
      <div className="space-y-3 rounded-lg border border-border p-4">
        <div className="flex items-center gap-3">
          <Checkbox
            id="req-pdf"
            checked={pdfChecked}
            onCheckedChange={(checked) => togglePdf(checked === true)}
          />
          <Label htmlFor="req-pdf" className="cursor-pointer">
            PDF
          </Label>
        </div>
        {pdfChecked && value.pdf && (
          <div className="ml-7 space-y-3">
            <div className="flex items-center gap-3">
              <Switch
                id="req-pdf-required"
                checked={value.pdf.required}
                onCheckedChange={(checked) =>
                  onChange({
                    ...value,
                    pdf: { ...value.pdf!, required: checked },
                  })
                }
              />
              <Label htmlFor="req-pdf-required">필수</Label>
            </div>
            <div className="space-y-1">
              <Label htmlFor="req-pdf-size" className="text-xs text-muted-foreground">
                최대 용량 (MB)
              </Label>
              <Input
                id="req-pdf-size"
                type="number"
                min={1}
                value={value.pdf.max_size_mb}
                onChange={(e) =>
                  onChange({
                    ...value,
                    pdf: { ...value.pdf!, max_size_mb: Number(e.target.value) },
                  })
                }
              />
            </div>
          </div>
        )}
      </div>

      {/* text_description — always checked, locked */}
      <div className="space-y-3 rounded-lg border border-border p-4">
        <div className="flex items-center gap-3">
          <Checkbox id="req-text-description" checked disabled />
          <Label htmlFor="req-text-description" className="cursor-default">
            텍스트 설명
          </Label>
        </div>
        <div className="ml-7 grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="req-text-min" className="text-xs text-muted-foreground">
              최소 글자 수
            </Label>
            <Input
              id="req-text-min"
              type="number"
              min={1}
              value={value.text_description.min_chars}
              onChange={(e) =>
                onChange({
                  ...value,
                  text_description: {
                    ...value.text_description,
                    min_chars: Number(e.target.value),
                  },
                })
              }
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="req-text-max" className="text-xs text-muted-foreground">
              최대 글자 수
            </Label>
            <Input
              id="req-text-max"
              type="number"
              min={1}
              value={value.text_description.max_chars}
              onChange={(e) =>
                onChange({
                  ...value,
                  text_description: {
                    ...value.text_description,
                    max_chars: Number(e.target.value),
                  },
                })
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}
