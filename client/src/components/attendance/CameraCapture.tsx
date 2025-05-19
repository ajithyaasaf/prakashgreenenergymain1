import React, { useRef, useState, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TbCamera, TbCameraOff, TbRefresh } from "react-icons/tb";
import { storage } from '@/firebase/config';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Spinner } from '@/components/ui/spinner';

interface CameraCaptureProps {
  onCapture: (photoUrl: string) => void;
  onError?: (error: Error) => void;
}

export function CameraCapture({ onCapture, onError }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Start camera
  const startCamera = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }, // Use back camera if available
        audio: false
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      
      setStream(mediaStream);
      setCameraActive(true);
    } catch (err) {
      console.error('Error accessing camera:', err);
      setError('Unable to access camera. Please ensure camera permissions are enabled.');
      if (onError && err instanceof Error) {
        onError(err);
      }
    } finally {
      setLoading(false);
    }
  }, [onError]);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
      setCameraActive(false);
      
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    }
  }, [stream]);

  // Take photo
  const takePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const context = canvas.getContext('2d');
    if (context) {
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const photoDataUrl = canvas.toDataURL('image/jpeg');
      setPhoto(photoDataUrl);
      
      // Stop the camera after taking the photo
      stopCamera();
    }
  }, [stopCamera]);

  // Reset and restart camera
  const retakePhoto = useCallback(() => {
    setPhoto(null);
    startCamera();
  }, [startCamera]);

  // Upload photo to Firebase storage and get URL
  const uploadPhoto = useCallback(async () => {
    if (!photo) return;
    
    try {
      setLoading(true);
      
      // Convert data URL to blob
      const response = await fetch(photo);
      const blob = await response.blob();
      
      // Create a unique filename
      const filename = `checkout_photos/${Date.now()}_${Math.random().toString(36).substring(2, 9)}.jpg`;
      const storageRef = ref(storage, filename);
      
      // Upload to Firebase Storage
      await uploadBytes(storageRef, blob);
      
      // Get download URL
      const downloadUrl = await getDownloadURL(storageRef);
      
      // Call the onCapture callback with the url
      onCapture(downloadUrl);
      
    } catch (err) {
      console.error('Error uploading photo:', err);
      setError('Failed to upload photo. Please try again.');
      if (onError && err instanceof Error) {
        onError(err);
      }
    } finally {
      setLoading(false);
    }
  }, [photo, onCapture, onError]);

  // Clean up on unmount
  React.useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        {error && (
          <div className="bg-red-50 text-red-700 p-3 rounded-md mb-4">
            {error}
          </div>
        )}

        <div className="relative mb-4 bg-slate-100 dark:bg-slate-800 rounded-md overflow-hidden">
          {/* Video preview */}
          {cameraActive && (
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted 
              className="w-full h-[300px] object-cover"
            />
          )}
          
          {/* Captured photo */}
          {photo && (
            <img 
              src={photo} 
              alt="Captured" 
              className="w-full h-[300px] object-cover" 
            />
          )}

          {/* Canvas for photo capture (hidden) */}
          <canvas 
            ref={canvasRef} 
            className="hidden" 
          />
          
          {/* Loading overlay */}
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <Spinner className="w-12 h-12 text-white" />
            </div>
          )}
          
          {/* Empty state when no camera is active and no photo is taken */}
          {!cameraActive && !photo && !loading && (
            <div className="w-full h-[300px] flex flex-col items-center justify-center text-slate-400">
              <TbCameraOff className="w-12 h-12 mb-2" />
              <p>No camera activated</p>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2 justify-center">
          {!cameraActive && !photo && (
            <Button onClick={startCamera} disabled={loading}>
              <TbCamera className="mr-2" /> Activate Camera
            </Button>
          )}
          
          {cameraActive && !photo && (
            <Button onClick={takePhoto} disabled={loading}>
              <TbCamera className="mr-2" /> Take Photo
            </Button>
          )}
          
          {photo && (
            <>
              <Button onClick={retakePhoto} variant="outline" disabled={loading}>
                <TbRefresh className="mr-2" /> Retake
              </Button>
              
              <Button onClick={uploadPhoto} disabled={loading}>
                {loading ? <Spinner className="mr-2" /> : null}
                Use This Photo
              </Button>
            </>
          )}
          
          {cameraActive && (
            <Button 
              onClick={stopCamera} 
              variant="outline" 
              disabled={loading}
            >
              <TbCameraOff className="mr-2" /> Cancel
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}