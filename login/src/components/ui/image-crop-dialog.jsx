"use client";

import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const PREVIEW_SIZE = 280;
const EXPORT_SIZE = 600;
const MIN_CROP_SIZE = 120;
const OFFSET_LIMIT = 240;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const clampOffset = (value) => clamp(value, -OFFSET_LIMIT, OFFSET_LIMIT);

const defaultCropBox = () => {
  const size = 220;
  const position = (PREVIEW_SIZE - size) / 2;
  return { x: position, y: position, size };
};

const loadImageElement = (src) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Unable to read image"));
    image.src = src;
  });

const drawPreview = ({
  canvas,
  image,
  zoom,
  offsetX,
  offsetY,
  rotation,
  cropBox,
}) => {
  if (!canvas || !image) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  canvas.width = PREVIEW_SIZE;
  canvas.height = PREVIEW_SIZE;
  ctx.clearRect(0, 0, PREVIEW_SIZE, PREVIEW_SIZE);
  ctx.fillStyle = "#f1f5f9";
  ctx.fillRect(0, 0, PREVIEW_SIZE, PREVIEW_SIZE);

  const baseScale = Math.max(cropBox.size / image.width, cropBox.size / image.height);
  const finalScale = baseScale * zoom;

  ctx.save();
  ctx.translate(PREVIEW_SIZE / 2 + offsetX, PREVIEW_SIZE / 2 + offsetY);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.scale(finalScale, finalScale);
  ctx.drawImage(image, -image.width / 2, -image.height / 2);
  ctx.restore();
};

const renderExportBlob = ({ image, zoom, offsetX, offsetY, rotation, cropBox }) => {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const previewCenter = PREVIEW_SIZE / 2;
  const cropCenterX = cropBox.x + cropBox.size / 2;
  const cropCenterY = cropBox.y + cropBox.size / 2;

  const baseScalePreview = Math.max(cropBox.size / image.width, cropBox.size / image.height);
  const previewScale = baseScalePreview * zoom;
  const scaleRatio = EXPORT_SIZE / cropBox.size;
  const exportScale = previewScale * scaleRatio;
  const exportTranslateX = ((previewCenter + offsetX - cropCenterX) * scaleRatio) + EXPORT_SIZE / 2;
  const exportTranslateY = ((previewCenter + offsetY - cropCenterY) * scaleRatio) + EXPORT_SIZE / 2;

  canvas.width = EXPORT_SIZE;
  canvas.height = EXPORT_SIZE;
  ctx.clearRect(0, 0, EXPORT_SIZE, EXPORT_SIZE);

  ctx.save();
  ctx.translate(exportTranslateX, exportTranslateY);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.scale(exportScale, exportScale);
  ctx.drawImage(image, -image.width / 2, -image.height / 2);
  ctx.restore();

  return new Promise((resolve) => {
    canvas.toBlob(resolve, "image/jpeg", 0.92);
  });
};

export default function ImageCropDialog({
  open,
  sourceUrl,
  fileName,
  isSubmitting = false,
  title = "Crop image",
  description = "Adjust image position before uploading.",
  confirmLabel = "Crop & continue",
  onCancel,
  onConfirm,
  onError,
}) {
  const [imageElement, setImageElement] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [cropBox, setCropBox] = useState(defaultCropBox());
  const [isImageDragging, setImageDragging] = useState(false);
  const [isCropBoxDragging, setCropBoxDragging] = useState(false);
  const [isCropBoxResizing, setCropBoxResizing] = useState(false);

  const previewCanvasRef = useRef(null);
  const imageDragRef = useRef({
    isActive: false,
    pointerId: null,
    startX: 0,
    startY: 0,
    originOffsetX: 0,
    originOffsetY: 0,
  });
  const cropBoxDragRef = useRef({
    isActive: false,
    mode: "",
    pointerId: null,
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
    originSize: 0,
  });

  useEffect(() => {
    if (!open || !sourceUrl) return;
    let mounted = true;
    loadImageElement(sourceUrl)
      .then((img) => {
        if (!mounted) return;
        setImageElement(img);
      })
      .catch(() => {
        if (!mounted) return;
        setImageElement(null);
        onError?.("Unable to open image for cropping.");
      });

    return () => {
      mounted = false;
    };
  }, [open, sourceUrl, onError]);

  useEffect(() => {
    if (!open || !imageElement) {
      return;
    }
    drawPreview({
      canvas: previewCanvasRef.current,
      image: imageElement,
      zoom,
      offsetX,
      offsetY,
      rotation,
      cropBox,
    });
  }, [open, imageElement, zoom, offsetX, offsetY, rotation, cropBox]);

  const stopCropBoxDrag = () => {
    cropBoxDragRef.current = {
      isActive: false,
      mode: "",
      pointerId: null,
      startX: 0,
      startY: 0,
      originX: 0,
      originY: 0,
      originSize: 0,
    };
    setCropBoxDragging(false);
    setCropBoxResizing(false);
  };

  const stopImageDrag = () => {
    imageDragRef.current = {
      isActive: false,
      pointerId: null,
      startX: 0,
      startY: 0,
      originOffsetX: 0,
      originOffsetY: 0,
    };
    setImageDragging(false);
  };

  const handleCanvasPointerDown = (event) => {
    if (isSubmitting || !imageElement || cropBoxDragRef.current.isActive) return;
    event.preventDefault();
    const target = event.currentTarget;
    target?.setPointerCapture?.(event.pointerId);
    imageDragRef.current = {
      isActive: true,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originOffsetX: offsetX,
      originOffsetY: offsetY,
    };
    setImageDragging(true);
  };

  const handleCanvasPointerMove = (event) => {
    const cropState = cropBoxDragRef.current;
    if (cropState.isActive && cropState.pointerId === event.pointerId) {
      const deltaX = event.clientX - cropState.startX;
      const deltaY = event.clientY - cropState.startY;

      if (cropState.mode === "move") {
        setCropBox((prev) => ({
          ...prev,
          x: clamp(cropState.originX + deltaX, 0, PREVIEW_SIZE - prev.size),
          y: clamp(cropState.originY + deltaY, 0, PREVIEW_SIZE - prev.size),
        }));
      }

      if (cropState.mode === "resize") {
        setCropBox((prev) => {
          const maxSize = Math.min(PREVIEW_SIZE - cropState.originX, PREVIEW_SIZE - cropState.originY);
          const delta = Math.max(deltaX, deltaY);
          return {
            ...prev,
            size: clamp(cropState.originSize + delta, MIN_CROP_SIZE, maxSize),
          };
        });
      }
      return;
    }

    const dragState = imageDragRef.current;
    if (!dragState.isActive || dragState.pointerId !== event.pointerId) return;
    const deltaX = event.clientX - dragState.startX;
    const deltaY = event.clientY - dragState.startY;
    setOffsetX(clampOffset(dragState.originOffsetX + deltaX));
    setOffsetY(clampOffset(dragState.originOffsetY + deltaY));
  };

  const handleCanvasPointerUp = (event) => {
    const cropState = cropBoxDragRef.current;
    if (cropState.isActive && cropState.pointerId === event.pointerId) {
      event.currentTarget?.releasePointerCapture?.(event.pointerId);
      stopCropBoxDrag();
      return;
    }

    const dragState = imageDragRef.current;
    if (!dragState.isActive || dragState.pointerId !== event.pointerId) return;
    event.currentTarget?.releasePointerCapture?.(event.pointerId);
    stopImageDrag();
  };

  const handleCropBoxMovePointerDown = (event) => {
    if (isSubmitting || !imageElement) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget?.setPointerCapture?.(event.pointerId);
    cropBoxDragRef.current = {
      isActive: true,
      mode: "move",
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: cropBox.x,
      originY: cropBox.y,
      originSize: cropBox.size,
    };
    setCropBoxDragging(true);
  };

  const handleCropBoxResizePointerDown = (event) => {
    if (isSubmitting || !imageElement) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget?.setPointerCapture?.(event.pointerId);
    cropBoxDragRef.current = {
      isActive: true,
      mode: "resize",
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: cropBox.x,
      originY: cropBox.y,
      originSize: cropBox.size,
    };
    setCropBoxResizing(true);
  };

  const handleConfirm = async () => {
    if (!imageElement) {
      onError?.("Unable to crop image.");
      return;
    }

    const blob = await renderExportBlob({
      image: imageElement,
      zoom,
      offsetX,
      offsetY,
      rotation,
      cropBox,
    });

    if (!blob) {
      onError?.("Unable to crop image.");
      return;
    }

    const normalizedFileName = (fileName || "image")
      .replace(/\.[^.]+$/, "")
      .concat(".jpg");
    const croppedFile = new File([blob], normalizedFileName, {
      type: "image/jpeg",
    });
    const previewUrl = URL.createObjectURL(croppedFile);
    onConfirm?.(croppedFile, previewUrl);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !isSubmitting) {
          onCancel?.();
        }
      }}
    >
      <DialogContent className="max-w-xl border border-blue-100 bg-white/95">
        <DialogHeader>
          <DialogTitle className="text-xl text-gray-900">{title}</DialogTitle>
          <DialogDescription className="text-sm text-gray-600">
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div
            className={`mx-auto w-fit rounded-2xl border border-blue-100 bg-slate-100 p-2 ${
              isImageDragging ? "cursor-grabbing" : "cursor-grab"
            }`}
            style={{ touchAction: "none" }}
            onPointerDown={handleCanvasPointerDown}
            onPointerMove={handleCanvasPointerMove}
            onPointerUp={handleCanvasPointerUp}
            onPointerCancel={handleCanvasPointerUp}
            onPointerLeave={handleCanvasPointerUp}
          >
            <div className="relative h-[280px] w-[280px] overflow-hidden rounded-xl">
              <canvas
                ref={previewCanvasRef}
                width={PREVIEW_SIZE}
                height={PREVIEW_SIZE}
                className="h-[280px] w-[280px]"
              />

              <div
                className={`absolute border-2 border-white shadow-[0_0_0_9999px_rgba(15,23,42,0.35)] ${
                  isCropBoxDragging ? "cursor-move" : "cursor-grab"
                } ${isCropBoxResizing ? "ring-2 ring-blue-200" : ""}`}
                style={{
                  left: `${cropBox.x}px`,
                  top: `${cropBox.y}px`,
                  width: `${cropBox.size}px`,
                  height: `${cropBox.size}px`,
                }}
                onPointerDown={handleCropBoxMovePointerDown}
                onPointerMove={handleCanvasPointerMove}
                onPointerUp={handleCanvasPointerUp}
                onPointerCancel={handleCanvasPointerUp}
              >
                <div className="pointer-events-none absolute inset-0 border border-white/60" />
                <button
                  type="button"
                  className="absolute -bottom-2 -right-2 h-4 w-4 cursor-nwse-resize rounded-full border border-white bg-blue-500"
                  onPointerDown={handleCropBoxResizePointerDown}
                  aria-label="Resize crop area"
                />
              </div>
            </div>
          </div>

          <p className="text-center text-xs text-gray-500">
            Drag image to reposition. Move/resize the crop border to choose area and amount.
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-2 text-xs font-semibold text-gray-700">
              Zoom
              <input
                type="range"
                min="1"
                max="3"
                step="0.01"
                value={zoom}
                onChange={(event) => setZoom(Number(event.target.value))}
                disabled={isSubmitting}
              />
            </label>
            <label className="flex flex-col gap-2 text-xs font-semibold text-gray-700">
              Rotate
              <input
                type="range"
                min="-180"
                max="180"
                step="1"
                value={rotation}
                onChange={(event) => setRotation(Number(event.target.value))}
                disabled={isSubmitting}
              />
            </label>
          </div>

          <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className="w-full sm:w-auto rounded-xl border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-70"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isSubmitting || !imageElement}
              className="w-full sm:w-auto rounded-xl bg-blue-600 px-5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? "Uploading..." : confirmLabel}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
