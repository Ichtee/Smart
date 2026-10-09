'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { parseOffNutriments } from '@/utils/openFoodFacts';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDetectedProduct: (product: {
    name: string;
    calories: number;
    protein: number | null;
    carbs: number | null;
    fat: number | null;
    servingSize: string;
  }) => void;
}

export default function BarcodeScannerModal({
  isOpen,
  onClose,
  onDetectedProduct,
}: BarcodeScannerModalProps) {
  const [loading, setLoading] = useState(false);
  const [manualBarcode, setManualBarcode] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const html5QrcodeRef = useRef<Html5Qrcode | null>(null);
  // The scanner is started once per opening, so it calls the latest handlers through this ref.
  const handlersRef = useRef<{ onSuccess: (text: string) => void; onFailure: () => void }>({ onSuccess: () => {}, onFailure: () => {} });

  useEffect(() => {
    if (!isOpen) return;

    let html5QrcodeScanner: Html5Qrcode | null = null;

    const startScanner = async () => {
      try {
        setErrorMsg(null);
        setScanning(true);

        html5QrcodeScanner = new Html5Qrcode('barcode-reader-div');
        html5QrcodeRef.current = html5QrcodeScanner;

        const config = {
          fps: 10,
          qrbox: { width: 260, height: 160 },
          aspectRatio: 1.0,
        };

        // Try using environment (back) camera first
        await html5QrcodeScanner.start(
          { facingMode: 'environment' },
          config,
          text => handlersRef.current.onSuccess(text),
          () => handlersRef.current.onFailure()
        );
      } catch (err) {
        console.warn('Environment camera failed, trying fallback camera:', err);
        try {
          if (html5QrcodeScanner) {
            await html5QrcodeScanner.start(
              { facingMode: 'user' },
              { fps: 10, qrbox: { width: 260, height: 160 } },
              text => handlersRef.current.onSuccess(text),
              () => handlersRef.current.onFailure()
            );
          }
        } catch {
          setErrorMsg('Không thể mở Camera. Vui lòng cấp quyền truy cập Camera hoặc nhập mã vạch bằng tay bên dưới.');
          setScanning(false);
        }
      }
    };

    const timer = setTimeout(() => {
      startScanner();
    }, 300);

    return () => {
      clearTimeout(timer);
      if (html5QrcodeRef.current && html5QrcodeRef.current.isScanning) {
        html5QrcodeRef.current.stop().catch(console.error);
      }
    };
  }, [isOpen]);

  const stopScannerIfRunning = async () => {
    if (html5QrcodeRef.current && html5QrcodeRef.current.isScanning) {
      try {
        await html5QrcodeRef.current.stop();
      } catch (e) {
        console.error(e);
      }
    }
  };

  const onScanSuccess = async (decodedText: string) => {
    await stopScannerIfRunning();
    fetchProductByBarcode(decodedText);
  };

  const onScanFailure = () => {
    // Ignore frame read failures
  };

  const fetchProductByBarcode = async (barcode: string) => {
    const cleanBarcode = barcode.trim();
    if (!cleanBarcode) return;

    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${cleanBarcode}.json`);
      
      if (!res.ok) {
        throw new Error('API request failed');
      }

      const data = await res.json();

      if (data.status === 1 && data.product) {
        const p = data.product;
        const nutriments = p.nutriments || {};

        // Extract best product name
        const name = p.product_name_vi || p.product_name || p.abbreviated_name || `Sản phẩm ${cleanBarcode}`;
        
        // calories, macros and serving label from one basis (per 100 g, else per serving)
        const facts = parseOffNutriments(nutriments, p.serving_size);
        // no energy value at all: keep the name and let the user type the calories
        onDetectedProduct(facts ? { name, ...facts } : { name, calories: 0, protein: null, carbs: null, fat: null, servingSize: '100g' });

        onClose();
      } else {
        setErrorMsg(`Không tìm thấy mã vạch "${cleanBarcode}" trong cơ sở dữ liệu Open Food Facts. Bạn có thể tự điền thông tin món ăn thủ công.`);
      }
    } catch (err) {
      console.error('Error fetching barcode data:', err);
      setErrorMsg('Không thể kết nối tới cơ sở dữ liệu mã vạch. Vui lòng kiểm tra kết nối mạng hoặc thử lại.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handlersRef.current = { onSuccess: onScanSuccess, onFailure: onScanFailure };
  });

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualBarcode) {
      stopScannerIfRunning();
      fetchProductByBarcode(manualBarcode);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-md" 
        onClick={async () => {
          await stopScannerIfRunning();
          onClose();
        }} 
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-md bg-card border border-primary/30 rounded-3xl p-6 shadow-2xl z-10 text-white space-y-5 animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <span className="text-xl">📷</span>
            <h3 className="text-base font-bold text-white uppercase tracking-wider">Quét Mã Vạch Thực Phẩm</h3>
          </div>
          <button
            onClick={async () => {
              await stopScannerIfRunning();
              onClose();
            }}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition"
          >
            ✕
          </button>
        </div>

        {/* Camera Scanner Box */}
        <div className="relative bg-black rounded-2xl overflow-hidden border border-slate-800 min-h-[220px] flex items-center justify-center">
          <div id="barcode-reader-div" className="w-full h-full" />

          {loading && (
            <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center space-y-3 z-20">
              <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs font-semibold text-primary animate-pulse">Đang tra cứu thông tin sản phẩm...</p>
            </div>
          )}

          {!scanning && !loading && !errorMsg && (
            <div className="absolute inset-0 flex items-center justify-center p-4 text-center">
              <p className="text-xs text-slate-400">Đang khởi động Camera...</p>
            </div>
          )}
        </div>

        {/* Instructions */}
        <p className="text-xs text-slate-400 text-center">
          💡 Đưa mã vạch của sản phẩm (hộp sữa, gói mì, hũ whey, đồ đóng hộp) vào giữa khung ngắm để tự động nhận diện.
        </p>

        {/* Error message */}
        {errorMsg && (
          <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-xl text-xs text-destructive text-center space-y-1">
            <p className="font-semibold">{errorMsg}</p>
          </div>
        )}

        {/* Manual Barcode Input Fallback */}
        <form onSubmit={handleManualSubmit} className="space-y-2 pt-2 border-t border-slate-800">
          <label className="text-xs font-semibold text-slate-300 block">
            Hoặc nhập mã số mã vạch thủ công:
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="VD: 8934563123456"
              value={manualBarcode}
              onChange={(e) => setManualBarcode(e.target.value)}
              className="flex-1 bg-inset border border-slate-700 focus:border-primary rounded-xl px-3 py-2 text-xs text-white outline-none"
            />
            <button
              type="submit"
              disabled={loading || !manualBarcode.trim()}
              className="bg-primary hover:bg-primary/80 disabled:opacity-50 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs transition"
            >
              Tra cứu
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
