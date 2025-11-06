
'use client';

import { useRef, useEffect, useImperativeHandle, forwardRef, useState } from 'react';
import { Button } from './ui/button';
import { RotateCcw, Save } from 'lucide-react';

export type SignaturePadRef = {
  getSignatureDataUrl: () => string | undefined;
  isEmpty: () => boolean;
};

export const SignaturePad = forwardRef<SignaturePadRef, {}>((props, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const lastX = useRef(0);
  const lastY = useRef(0);
  const [signatureData, setSignatureData] = useState<string | undefined>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const resizeCanvas = () => {
      const parent = canvas.parentElement;
      if (parent) {
        const { width } = parent.getBoundingClientRect();
        canvas.width = width;
        canvas.height = 200;
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        if (signatureData) {
            const img = new Image();
            img.src = signatureData;
            img.onload = () => ctx.drawImage(img, 0, 0);
        }
      }
    };

    const getMousePos = (evt: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: evt.clientX - rect.left,
        y: evt.clientY - rect.top,
      };
    };
    
    const getTouchPos = (evt: TouchEvent) => {
        const rect = canvas.getBoundingClientRect();
        return {
            x: evt.touches[0].clientX - rect.left,
            y: evt.touches[0].clientY - rect.top,
        }
    }

    const startDrawing = (e: MouseEvent | TouchEvent) => {
      isDrawing.current = true;
      const pos = e instanceof MouseEvent ? getMousePos(e) : getTouchPos(e);
      [lastX.current, lastY.current] = [pos.x, pos.y];
    };

    const draw = (e: MouseEvent | TouchEvent) => {
      if (!isDrawing.current) return;
      e.preventDefault();

      const pos = e instanceof MouseEvent ? getMousePos(e) : getTouchPos(e);

      ctx.beginPath();
      ctx.moveTo(lastX.current, lastY.current);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();

      [lastX.current, lastY.current] = [pos.x, pos.y];
    };

    const stopDrawing = () => {
      if (!isDrawing.current) return;
      isDrawing.current = false;
    };
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);
    
    canvas.addEventListener('touchstart', startDrawing);
    canvas.addEventListener('touchmove', draw);
    canvas.addEventListener('touchend', stopDrawing);


    return () => {
      window.removeEventListener('resize', resizeCanvas);
      canvas.removeEventListener('mousedown', startDrawing);
      canvas.removeEventListener('mousemove', draw);
      canvas.removeEventListener('mouseup', stopDrawing);
      canvas.removeEventListener('mouseout', stopDrawing);
      canvas.removeEventListener('touchstart', startDrawing);
      canvas.removeEventListener('touchmove', draw);
      canvas.removeEventListener('touchend', stopDrawing);
    };
  }, [signatureData]);

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSignatureData(undefined);
  };
  
  const saveSignature = () => {
      if (canvasRef.current && !isEmpty()) {
          setSignatureData(canvasRef.current.toDataURL('image/png'));
      }
  }

  useImperativeHandle(ref, () => ({
    getSignatureDataUrl: () => {
        return signatureData;
    },
    isEmpty: () => {
        return !signatureData;
    }
  }));

  const isEmpty = () => {
    const canvas = canvasRef.current;
    if (!canvas) return true;
    const ctx = canvas.getContext('2d');
    if (!ctx) return true;
    const pixelBuffer = new Uint32Array(ctx.getImageData(0, 0, canvas.width, canvas.height).data.buffer);
    return !pixelBuffer.some(color => color !== 0);
  }

  return (
    <div className="w-full space-y-2">
      <canvas
        ref={canvasRef}
        className="w-full h-[200px] border rounded-md bg-gray-50 cursor-crosshair touch-none"
      />
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={clearSignature} className="flex items-center gap-2">
            <RotateCcw className="h-4 w-4" />
            Clear Signature
        </Button>
        <Button variant="default" size="sm" onClick={saveSignature} className="flex items-center gap-2">
            <Save className="h-4 w-4" />
            Save Signature
        </Button>
      </div>
    </div>
  );
});

SignaturePad.displayName = 'SignaturePad';
