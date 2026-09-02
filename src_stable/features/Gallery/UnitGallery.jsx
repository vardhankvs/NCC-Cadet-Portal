// src/features/Gallery/UnitGallery.jsx
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useDataContext } from '../../context/DataContext.jsx';
import { useAuthContext } from '../../context/AuthContext.jsx';
import { ModalOverlay } from '../../components/ui/ModalOverlay.jsx';
import { 
    X, 
    ImageIcon, 
    Camera, 
    MapPin, 
    Calendar, 
    Plus, 
    Trash2, 
    Upload, 
    Loader, 
    RefreshCcw, 
    Check, 
    Edit2,
    Search,
    ChevronLeft,
    ChevronRight,
    Download,
    Eye
} from '../../components/Icons.jsx';
import { saveGalleryItem, deleteItem } from '../../firebase/firestoreService.js';
import { toast } from 'react-toastify';
import { formatDate } from '../../utils/dateUtils.js';

/**
 * Canvas image compression for gallery uploads.
 * Max dimension 800px, quality 0.82 — ~80-150KB, safe for Firestore & high resolution.
 */
const compressImageToBase64 = (file, maxDim = 800, quality = 0.82) =>
    new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
            URL.revokeObjectURL(url);
            const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
            const w = Math.round(img.width * scale);
            const h = Math.round(img.height * scale);
            const canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            canvas.getContext('2d').drawImage(img, 0, 0, w, h);
            resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = reject;
        img.src = url;
    });

export const UnitGallery = () => {
    const { userRole, userInstitutionId, user } = useAuthContext();
    const { events, gallery = [], units = [] } = useDataContext();
    const [selectedImage, setSelectedImage] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [deletingId, setDeletingId] = useState(null);

    // Edit (Update) states
    const [editItem, setEditItem] = useState(null);  // the gallery item being edited
    const [editTitle, setEditTitle] = useState('');
    const [editLocation, setEditLocation] = useState('');
    const [editDate, setEditDate] = useState('');
    const [editSubmitting, setEditSubmitting] = useState(false);

    // File Upload Form states
    const [photoFile, setPhotoFile] = useState(null);
    const [photoPreview, setPhotoPreview] = useState('');
    const [title, setTitle] = useState('');
    const [location, setLocation] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [submitting, setSubmitting] = useState(false);
    const fileInputRef = useRef(null);

    // Live Camera states
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [cameraStream, setCameraStream] = useState(null);
    const [cameraError, setCameraError] = useState(null);
    const [capturedPhoto, setCapturedPhoto] = useState(null);
    const [cameraTitle, setCameraTitle] = useState('');
    const [cameraLocation, setCameraLocation] = useState('');
    const [cameraDate, setCameraDate] = useState(new Date().toISOString().split('T')[0]);
    const [facingMode, setFacingMode] = useState('environment');
    const videoRef = useRef(null);
    const nativeCameraInputRef = useRef(null);

    const [searchQuery, setSearchQuery] = useState('');

    const canUpload = ['admin', 'officer', 'superadmin', 'battalion_admin', 'ano'].includes((userRole || '').toLowerCase());
    const isBattalionAdmin = userRole === 'superadmin' || userRole === 'battalion_admin';

    // Get current college details
    const activeInstitutionId = isBattalionAdmin ? '14a-bn-srikakulam' : (userInstitutionId || 'gmrit');
    const collegeUnit = useMemo(() => {
        return (units || []).find(u => u.subdomain === activeInstitutionId);
    }, [units, activeInstitutionId]);

    const collegeName = collegeUnit?.collegeName || collegeUnit?.unitName || (activeInstitutionId === 'gmrit' ? 'GMR Institute of Technology' : activeInstitutionId);

    // Unit uploads only
    const allImages = useMemo(() => {
        const list = [];

        (gallery || []).forEach(item => {
            if (!isBattalionAdmin) {
                const matchInst = !item.institutionId || item.institutionId === '14a-bn-srikakulam' || item.institutionId === activeInstitutionId;
                if (!matchInst) return;
            }

            if (item.photoUrl && typeof item.photoUrl === 'string' && item.photoUrl.trim().length > 0) {
                list.push({
                    id: item.id,
                    url: item.photoUrl,
                    title: item.title || 'NCC Activity',
                    date: item.date ? formatDate(item.date) : 'N/A',
                    rawDate: item.date || null,
                    location: item.location || collegeName,
                    institutionId: item.institutionId || activeInstitutionId,
                    isUserUploaded: true,
                    uploaderName: item.uploaderName || 'ANO'
                });
            }
        });

        return list;
    }, [gallery, isBattalionAdmin, activeInstitutionId, collegeName]);

    // Dynamic Filtered List based on search
    const filteredImages = useMemo(() => {
        let list = allImages || [];
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            list = list.filter(i => 
                (i.title || '').toLowerCase().includes(q) || 
                (i.location || '').toLowerCase().includes(q) ||
                (i.date || '').toLowerCase().includes(q)
            );
        }
        return list;
    }, [allImages, searchQuery]);

    // Lightbox navigation helpers
    const currentLightboxIndex = useMemo(() => {
        if (!selectedImage) return -1;
        return filteredImages.findIndex(img => img.id === selectedImage.id);
    }, [filteredImages, selectedImage]);

    const showPrevImage = () => {
        if (currentLightboxIndex > 0) {
            setSelectedImage(filteredImages[currentLightboxIndex - 1]);
        }
    };

    const showNextImage = () => {
        if (currentLightboxIndex !== -1 && currentLightboxIndex < filteredImages.length - 1) {
            setSelectedImage(filteredImages[currentLightboxIndex + 1]);
        }
    };

    const handleDownloadImage = (img, e) => {
        if (e) e.stopPropagation();
        try {
            const link = document.createElement('a');
            link.href = img.url;
            link.download = `${(img.title || 'ncc_photo').replace(/[^a-z0-9]/gi, '_')}.jpg`;
            link.target = '_blank';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            toast.success("Download started!");
        } catch (err) {
            toast.error("Could not download image directly");
        }
    };

    // Keyboard navigation listener
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (!selectedImage) return;
            if (e.key === 'Escape') setSelectedImage(null);
            if (e.key === 'ArrowLeft') showPrevImage();
            if (e.key === 'ArrowRight') showNextImage();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedImage, currentLightboxIndex, filteredImages]);

    // ── Live Camera Functions ──
    const startCamera = async (mode = facingMode) => {
        setCameraError(null);
        try {
            if (cameraStream) {
                cameraStream.getTracks().forEach(track => track.stop());
            }
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: mode, width: { ideal: 1920 }, height: { ideal: 1080 } },
                audio: false
            });
            setCameraStream(stream);
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (err) {
            console.error("Camera stream error:", err);
            setCameraError("Camera permission denied or unavailable. Use 'Device Camera App' below.");
        }
    };

    const stopCamera = () => {
        if (cameraStream) {
            cameraStream.getTracks().forEach(track => track.stop());
            setCameraStream(null);
        }
    };

    const openCameraModal = () => {
        setIsCameraOpen(true);
        setCapturedPhoto(null);
        setCameraTitle(`${collegeName} NCC Activity`);
        setCameraLocation(collegeName);
        setCameraDate(new Date().toISOString().split('T')[0]);
        startCamera('environment');
    };

    const closeCameraModal = () => {
        stopCamera();
        setIsCameraOpen(false);
        setCapturedPhoto(null);
        setCameraError(null);
    };

    useEffect(() => {
        return () => {
            stopCamera();
        };
    }, []);

    const handleTakeShot = () => {
        if (!videoRef.current) return;
        const video = videoRef.current;
        const canvas = document.createElement('canvas');
        const maxDim = 800;
        const scale = Math.min(1, maxDim / Math.max(video.videoWidth || 1280, video.videoHeight || 720));
        canvas.width = Math.round((video.videoWidth || 1280) * scale);
        canvas.height = Math.round((video.videoHeight || 720) * scale);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setCapturedPhoto(dataUrl);
        stopCamera();
    };

    const handleNativeCameraFile = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            const compressed = await compressImageToBase64(file);
            setCapturedPhoto(compressed);
            stopCamera();
        } catch (err) {
            toast.error("Failed to process captured image: " + err.message);
        }
    };

    const handleFlipCamera = () => {
        const newMode = facingMode === 'environment' ? 'user' : 'environment';
        setFacingMode(newMode);
        startCamera(newMode);
    };

    const handleRetakeShot = () => {
        setCapturedPhoto(null);
        startCamera(facingMode);
    };

    const handleUploadCapturedPhoto = async () => {
        if (!capturedPhoto) return;
        setSubmitting(true);
        try {
            await saveGalleryItem({
                title: (cameraTitle || `${collegeName} NCC Shot`).trim(),
                location: (cameraLocation || collegeName).trim(),
                date: cameraDate,
                photoUrl: capturedPhoto,
                institutionId: activeInstitutionId,
                uploaderName: user?.displayName || 'ANO Officer'
            });
            toast.success('Camera photo published to Unit Gallery!');
            closeCameraModal();
        } catch (err) {
            toast.error('Upload failed: ' + err.message);
        } finally {
            setSubmitting(false);
        }
    };

    // ── File Selection & Upload ──
    const handleFileSelect = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            toast.error('Please select a valid image file (JPG, PNG, WEBP).');
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            toast.error('Image size must be less than 5MB.');
            return;
        }
        setPhotoFile(file);
        const reader = new FileReader();
        reader.onload = (ev) => setPhotoPreview(ev.target.result);
        reader.readAsDataURL(file);
    };

    const handleUploadSubmit = async (e) => {
        e.preventDefault();
        if (!photoPreview) {
            toast.error('Please select a photo to upload.');
            return;
        }
        if (!title.trim()) {
            toast.error('Please enter a photo title or activity name.');
            return;
        }

        setSubmitting(true);
        try {
            let base64Photo = photoPreview;
            if (photoFile) {
                base64Photo = await compressImageToBase64(photoFile);
            }

            await saveGalleryItem({
                title: title.trim(),
                location: (location || collegeName).trim(),
                date: date,
                photoUrl: base64Photo,
                institutionId: activeInstitutionId,
                uploaderName: user?.displayName || 'ANO Officer'
            });

            toast.success('Photo uploaded successfully to Unit Gallery!');
            setIsUploading(false);
            setPhotoFile(null);
            setPhotoPreview('');
            setTitle('');
            setLocation('');
            setDate(new Date().toISOString().split('T')[0]);
        } catch (err) {
            toast.error('Upload failed: ' + err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeletePhoto = async (img, e) => {
        e.stopPropagation();
        if (!img.isUserUploaded || !img.id) return;
        if (!window.confirm(`Delete "${img.title}" from the Unit Gallery?`)) return;

        setDeletingId(img.id);
        try {
            await deleteItem('unit_gallery', img.id);
            toast.success('Photo deleted from gallery.');
            if (selectedImage?.id === img.id) setSelectedImage(null);
        } catch (err) {
            toast.error('Failed to delete photo: ' + err.message);
        } finally {
            setDeletingId(null);
        }
    };

    const openEditModal = (img, e) => {
        e.stopPropagation();
        if (!img.isUserUploaded || !img.id) return;
        setEditItem(img);
        setEditTitle(img.title || '');
        setEditLocation(img.location || '');
        // Normalize date to YYYY-MM-DD for input[type=date]
        const raw = img.rawDate || img.date;
        let dateStr = new Date().toISOString().split('T')[0];
        if (raw) {
            try {
                const parsed = new Date(raw);
                if (!isNaN(parsed)) dateStr = parsed.toISOString().split('T')[0];
            } catch (_) {}
        }
        setEditDate(dateStr);
    };

    const handleEditSave = async (e) => {
        e.preventDefault();
        if (!editItem?.id) return;
        setEditSubmitting(true);
        try {
            await saveGalleryItem(
                {
                    title: editTitle.trim(),
                    location: editLocation.trim() || collegeName,
                    date: editDate,
                    photoUrl: editItem.url,
                    institutionId: editItem.institutionId || activeInstitutionId,
                    uploaderName: editItem.uploaderName || user?.displayName || 'ANO Officer'
                },
                editItem.id   // pass id → triggers updateDoc
            );
            toast.success('Gallery photo updated successfully.');
            setEditItem(null);
        } catch (err) {
            toast.error('Update failed: ' + err.message);
        } finally {
            setEditSubmitting(false);
        }
    };

    return (
        <div className="space-y-6 w-full">
            {/* ── Top Hero & Action Header ── */}
            <div className="bg-white dark:bg-[#050b14] border border-[#ddd8cc] dark:border-white/10 rounded-3xl p-6 sm:p-8 shadow-sm transition-all">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-ncc-navy/5 dark:bg-white/10 text-ncc-navy dark:text-ncc-gold text-xs font-bold uppercase tracking-wider mb-3">
                            <ImageIcon className="w-3.5 h-3.5" />
                            Visual Chronicles
                        </div>
                        <h2 className="text-2xl sm:text-3xl font-display font-bold text-ncc-navy dark:text-white flex items-center gap-3">
                            {collegeName} Unit Gallery
                        </h2>
                        <p className="text-gray-500 dark:text-white/70 text-sm mt-1 max-w-2xl">
                            Official photo gallery of {collegeName} NCC unit camps, drill sessions, parades, and achievements.
                        </p>
                    </div>

                    {canUpload && (
                        <div className="flex flex-wrap items-center gap-3">
                            <button
                                onClick={() => {
                                    setIsUploading(true);
                                    if (!location) setLocation(collegeName);
                                }}
                                className="px-5 py-3 bg-white dark:bg-[#0a1628] text-ncc-navy dark:text-white border border-[#ddd8cc] dark:border-white/10 font-bold rounded-2xl hover:border-ncc-gold transition shadow-sm text-xs tracking-wider uppercase flex items-center gap-2"
                            >
                                <Upload className="w-4 h-4 text-ncc-gold" /> Upload File
                            </button>

                            <button
                                onClick={openCameraModal}
                                className="px-6 py-3.5 bg-ncc-gold hover:bg-ncc-gold/90 text-ncc-navy font-bold rounded-2xl transition-all shadow-[0_0_20px_rgba(184,131,14,0.3)] hover:scale-105 uppercase text-xs tracking-wider flex items-center gap-2"
                            >
                                <Camera className="w-4 h-4" /> Take Photo
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Search & Photo Count Bar ── */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center">
                <div className="flex items-center gap-2 text-xs font-bold text-gray-600 dark:text-white/70">
                    <span className="px-3 py-1.5 rounded-xl bg-white dark:bg-[#050b14] border border-[#ddd8cc] dark:border-white/10 text-ncc-navy dark:text-white font-black">
                        {filteredImages.length}
                    </span>
                    <span>Photo{filteredImages.length === 1 ? '' : 's'}</span>
                </div>

                {/* Search Bar */}
                <div className="relative min-w-[260px] sm:min-w-[320px]">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-white/40" />
                    <input 
                        type="text"
                        placeholder="Search photos by title, date, location..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-white dark:bg-[#050b14] border border-[#ddd8cc] dark:border-white/10 outline-none focus:border-ncc-navy dark:focus:border-ncc-gold transition-all text-xs dark:text-white shadow-sm"
                    />
                    {searchQuery && (
                        <button 
                            onClick={() => setSearchQuery('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-white"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>
            </div>

            {/* ── Responsive Full-Width Gallery Grid ── */}
            {filteredImages.length === 0 ? (
                <div className="bg-[#f5f0e8] dark:bg-[#0a1628] p-16 sm:p-20 text-center flex flex-col items-center justify-center border-2 border-dashed border-[#ddd8cc] dark:border-white/10 rounded-3xl w-full">
                    <div className="w-20 h-20 bg-ncc-navy/5 dark:bg-white/5 rounded-full flex items-center justify-center text-ncc-navy/30 dark:text-white/20 mb-4">
                        <Camera className="w-10 h-10" />
                    </div>
                    <h3 className="text-xl font-display font-bold text-ncc-navy dark:text-white">No gallery photos found</h3>
                    <p className="text-gray-500 dark:text-white/60 text-sm mt-1 max-w-md">
                        {canUpload ? "Click 'Take Photo' or 'Upload File' above to add photos from your unit's events, camps, and activities." : "Photos uploaded by the unit will appear here."}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 w-full">
                    {filteredImages.map((img, idx) => (
                        <div 
                            key={img.id || idx} 
                            className="group bg-white dark:bg-[#050b14] rounded-3xl overflow-hidden border border-[#ddd8cc] dark:border-white/10 shadow-md hover:shadow-2xl transition-all duration-300 flex flex-col isolate"
                        >
                            {/* Large Image Container with Zoom */}
                            <div 
                                className="relative h-80 sm:h-96 w-full overflow-hidden bg-gray-100 dark:bg-[#0a1628] cursor-pointer"
                                onClick={() => setSelectedImage(img)}
                            >
                                <img 
                                    src={img.url} 
                                    alt={img.title} 
                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                    onError={(e) => {
                                        e.currentTarget.style.display = 'none';
                                        e.currentTarget.parentElement.classList.add('bg-gradient-to-br', 'from-ncc-navy/20', 'to-ncc-gold/20');
                                    }}
                                />

                                {/* Top Action Overlay */}
                                <div className="absolute top-4 right-4 flex items-center gap-2 z-20">
                                    <button
                                        onClick={(e) => handleDownloadImage(img, e)}
                                        title="Download Photo"
                                        className="p-2.5 bg-black/60 hover:bg-ncc-navy text-white rounded-2xl backdrop-blur-md transition hover:scale-110 shadow-lg"
                                    >
                                        <Download className="w-4 h-4" />
                                    </button>
                                    {canUpload && img.isUserUploaded && (
                                        <>
                                            <button
                                                onClick={(e) => openEditModal(img, e)}
                                                title="Edit Photo Details"
                                                className="p-2.5 bg-black/60 hover:bg-ncc-navy text-white rounded-2xl backdrop-blur-md transition hover:scale-110 shadow-lg"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={(e) => handleDeletePhoto(img, e)}
                                                disabled={deletingId === img.id}
                                                title="Delete Photo"
                                                className="p-2.5 bg-black/60 hover:bg-red-600 text-white rounded-2xl backdrop-blur-md transition hover:scale-110 shadow-lg"
                                            >
                                                {deletingId === img.id ? <Loader className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                            </button>
                                        </>
                                    )}
                                </div>

                                {/* Hover overlay hint */}
                                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                                    <span className="px-4 py-2 rounded-xl bg-black/70 text-white text-xs font-bold uppercase tracking-wider backdrop-blur-md">
                                        Click to View Fullscreen
                                    </span>
                                </div>
                            </div>

                            {/* Card Details Footer */}
                            <div className="p-5 sm:p-6 flex flex-col justify-between flex-1 border-t border-[#ddd8cc]/60 dark:border-white/5">
                                <div>
                                    <h3 className="font-display font-bold text-base sm:text-xl text-ncc-navy dark:text-white leading-snug line-clamp-1">
                                        {img.title}
                                    </h3>
                                </div>
                                <div className="flex items-center justify-between gap-4 mt-3 pt-3 border-t border-[#ddd8cc]/40 dark:border-white/5 text-xs text-gray-500 dark:text-white/60 font-semibold">
                                    <span className="flex items-center gap-1.5">
                                        <Calendar className="w-4 h-4 text-ncc-gold" /> {img.date}
                                    </span>
                                    <span className="flex items-center gap-1.5 truncate max-w-[200px]">
                                        <MapPin className="w-4 h-4 text-ncc-gold shrink-0" /> {img.location}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* ── EDIT PHOTO MODAL ── */}
            {editItem && (
                <ModalOverlay>
                    <div className="bg-white dark:bg-[#0a1628] rounded-[2.5rem] p-6 sm:p-8 max-w-lg w-full border border-[#ddd8cc] dark:border-white/10 shadow-2xl animate-in zoom-in duration-200">
                        <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#ddd8cc] dark:border-white/10">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-ncc-navy/10 dark:bg-white/10 rounded-2xl text-ncc-gold">
                                    <Edit2 className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="font-display font-black text-xl text-ncc-navy dark:text-white">Edit Photo Details</h3>
                                    <p className="text-xs text-gray-500 dark:text-white/60">Update title, location or date</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setEditItem(null)}
                                className="p-2 text-gray-400 hover:text-ncc-navy dark:hover:text-white transition rounded-full hover:bg-gray-100 dark:hover:bg-white/10"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Photo Preview */}
                        <div className="aspect-video rounded-2xl overflow-hidden border border-[#ddd8cc] dark:border-white/10 mb-5">
                            <img src={editItem.url} alt={editItem.title} className="w-full h-full object-cover" />
                        </div>

                        <form onSubmit={handleEditSave} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-ncc-navy dark:text-white mb-1">Title / Event Name *</label>
                                <input
                                    type="text"
                                    required
                                    value={editTitle}
                                    onChange={(e) => setEditTitle(e.target.value)}
                                    placeholder="e.g. Annual Camp Parade"
                                    className="ncc-input text-xs"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-ncc-navy dark:text-white mb-1">Location</label>
                                    <input
                                        type="text"
                                        value={editLocation}
                                        onChange={(e) => setEditLocation(e.target.value)}
                                        placeholder="Location name..."
                                        className="ncc-input text-xs"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-ncc-navy dark:text-white mb-1">Date</label>
                                    <input
                                        type="date"
                                        value={editDate}
                                        onChange={(e) => setEditDate(e.target.value)}
                                        className="ncc-input text-xs"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#ddd8cc] dark:border-white/10">
                                <button
                                    type="button"
                                    onClick={() => setEditItem(null)}
                                    className="px-5 py-2.5 rounded-xl border border-gray-300 dark:border-white/20 text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-white/80 hover:bg-gray-100 dark:hover:bg-white/10 transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={editSubmitting}
                                    className="flex items-center gap-2 px-6 py-2.5 bg-ncc-navy text-white dark:bg-ncc-gold dark:text-ncc-navy font-bold rounded-xl text-xs uppercase tracking-widest hover:scale-105 transition shadow-md disabled:opacity-50"
                                >
                                    {editSubmitting ? <Loader className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                    {editSubmitting ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </ModalOverlay>
            )}

            {/* ── LIVE CAMERA CAPTURE MODAL ── */}
            {isCameraOpen && (
                <ModalOverlay>
                    <div className="bg-black/95 rounded-[2.5rem] p-6 max-w-2xl w-full border border-white/20 shadow-2xl relative animate-in zoom-in duration-200 text-white">
                        <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/15">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-ncc-gold/20 rounded-2xl text-ncc-gold">
                                    <Camera className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="font-display font-black text-lg text-white">Camera Capture</h3>
                                    <p className="text-xs text-white/60">{collegeName} NCC Unit</p>
                                </div>
                            </div>
                            <button
                                onClick={closeCameraModal}
                                className="p-2 text-white/70 hover:text-white transition rounded-full hover:bg-white/10"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Hidden Native Device Camera Input */}
                        <input
                            ref={nativeCameraInputRef}
                            type="file"
                            accept="image/*"
                            capture="environment"
                            onChange={handleNativeCameraFile}
                            className="hidden"
                        />

                        {/* Stage 1: Live Video Feed */}
                        {!capturedPhoto ? (
                            <div className="space-y-4">
                                <div className="relative aspect-video rounded-2xl overflow-hidden bg-black border border-white/10 flex items-center justify-center">
                                    {cameraError ? (
                                        <div className="p-6 text-center text-red-400 text-xs">
                                            <p className="font-bold">{cameraError}</p>
                                            <button
                                                type="button"
                                                onClick={() => nativeCameraInputRef.current?.click()}
                                                className="mt-4 px-5 py-2.5 bg-ncc-gold text-ncc-navy font-bold rounded-xl uppercase tracking-wider text-xs shadow-md"
                                            >
                                                Open Device Camera App
                                            </button>
                                        </div>
                                    ) : (
                                        <video
                                            ref={videoRef}
                                            autoPlay
                                            playsInline
                                            muted
                                            className="w-full h-full object-cover"
                                        />
                                    )}
                                </div>

                                {/* Controls Bar */}
                                <div className="flex items-center justify-around py-2">
                                    <button
                                        type="button"
                                        onClick={handleFlipCamera}
                                        title="Switch Camera"
                                        className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition"
                                    >
                                        <RefreshCcw className="w-5 h-5" />
                                    </button>

                                    <button
                                        type="button"
                                        onClick={handleTakeShot}
                                        title="Take Photo"
                                        className="w-16 h-16 rounded-full border-4 border-white bg-ncc-gold flex items-center justify-center text-ncc-navy shadow-[0_0_25px_rgba(184,131,14,0.6)] hover:scale-110 active:scale-95 transition"
                                    >
                                        <Camera className="w-8 h-8" />
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => nativeCameraInputRef.current?.click()}
                                        title="Use Camera App"
                                        className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition"
                                    >
                                        <Upload className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        ) : (
                            /* Stage 2: Captured Shot Review Dialog ("Is image OK?") */
                            <div className="space-y-4 animate-in fade-in">
                                <div className="relative aspect-video rounded-2xl overflow-hidden border-2 border-ncc-gold shadow-xl">
                                    <img src={capturedPhoto} alt="Captured Shot" className="w-full h-full object-cover" />
                                    <div className="absolute top-3 left-3 px-3 py-1 bg-black/70 backdrop-blur-md rounded-full text-[10px] font-bold text-ncc-gold uppercase tracking-widest border border-ncc-gold/30">
                                        Shot Captured
                                    </div>
                                </div>

                                <div className="text-center">
                                    <h4 className="text-base font-bold text-white">Is this photo OK to upload?</h4>
                                    <p className="text-xs text-white/60 mt-0.5">Review your shot before publishing to {collegeName} gallery.</p>
                                </div>

                                {/* Inputs */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
                                    <div>
                                        <label className="block text-[10px] font-bold uppercase tracking-wider text-white/80 mb-1">
                                            Title / Event Name *
                                        </label>
                                        <input
                                            type="text"
                                            value={cameraTitle}
                                            onChange={(e) => setCameraTitle(e.target.value)}
                                            placeholder="e.g. Morning Drill / Firing Practice"
                                            className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-xl text-xs text-white placeholder-white/40 outline-none focus:border-ncc-gold"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-bold uppercase tracking-wider text-white/80 mb-1">
                                            Location
                                        </label>
                                        <input
                                            type="text"
                                            value={cameraLocation}
                                            onChange={(e) => setCameraLocation(e.target.value)}
                                            placeholder="Location name..."
                                            className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-xl text-xs text-white placeholder-white/40 outline-none focus:border-ncc-gold"
                                        />
                                    </div>
                                </div>

                                {/* Retake / Confirm Actions */}
                                <div className="flex items-center justify-between gap-3 pt-3 border-t border-white/15">
                                    <button
                                        type="button"
                                        onClick={handleRetakeShot}
                                        className="flex items-center gap-2 px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition"
                                    >
                                        <RefreshCcw className="w-4 h-4" /> Retake Photo
                                    </button>

                                    <button
                                        type="button"
                                        onClick={handleUploadCapturedPhoto}
                                        disabled={submitting}
                                        className="flex items-center gap-2 px-6 py-2.5 bg-ncc-gold hover:bg-white text-ncc-navy font-bold rounded-xl text-xs uppercase tracking-widest transition shadow-md disabled:opacity-50"
                                    >
                                        {submitting ? <Loader className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                        {submitting ? 'Publishing...' : 'Yes, Upload Photo'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </ModalOverlay>
            )}

            {/* Upload File Modal */}
            {isUploading && (
                <ModalOverlay>
                    <div className="bg-white dark:bg-[#0a1628] rounded-[2.5rem] p-6 sm:p-8 max-w-lg w-full border border-[#ddd8cc] dark:border-white/10 shadow-2xl relative animate-in zoom-in duration-200">
                        <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#ddd8cc] dark:border-white/10">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-ncc-navy/10 dark:bg-white/10 rounded-2xl text-ncc-gold">
                                    <Upload className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="font-display font-black text-xl text-ncc-navy dark:text-white">Upload File</h3>
                                    <p className="text-xs text-gray-500 dark:text-white/60">Select image for {collegeName} gallery</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsUploading(false)}
                                className="p-2 text-gray-400 hover:text-ncc-navy dark:hover:text-white transition rounded-full hover:bg-gray-100 dark:hover:bg-white/10"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleUploadSubmit} className="space-y-4">
                            {/* Photo Upload Box */}
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-ncc-navy dark:text-white mb-2">
                                    Photo File
                                </label>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileSelect}
                                    className="hidden"
                                />

                                {photoPreview ? (
                                    <div className="relative aspect-video rounded-2xl overflow-hidden border-2 border-ncc-gold/40 group">
                                        <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-3">
                                            <button
                                                type="button"
                                                onClick={() => fileInputRef.current?.click()}
                                                className="px-3 py-1.5 bg-white text-ncc-navy rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-ncc-gold transition"
                                            >
                                                Change
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => { setPhotoFile(null); setPhotoPreview(''); }}
                                                className="px-3 py-1.5 bg-red-600 text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-red-700 transition"
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div
                                        onClick={() => fileInputRef.current?.click()}
                                        className="border-2 border-dashed border-gray-300 dark:border-white/20 hover:border-ncc-gold dark:hover:border-ncc-gold rounded-2xl p-8 text-center cursor-pointer transition bg-gray-50 dark:bg-white/5 hover:bg-ncc-navy/5"
                                    >
                                        <Upload className="w-10 h-10 text-ncc-gold mx-auto mb-2" />
                                        <p className="text-sm font-bold text-ncc-navy dark:text-white">Click to select photo</p>
                                        <p className="text-xs text-gray-400 dark:text-white/50 mt-1">PNG, JPG, WEBP up to 5MB</p>
                                    </div>
                                )}
                            </div>

                            {/* Photo Title */}
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-ncc-navy dark:text-white mb-1">
                                    Activity / Event Title *
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Annual Camp Parade / Firing Drill 2026"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="ncc-input text-xs"
                                />
                            </div>

                            {/* Location & Date */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-ncc-navy dark:text-white mb-1">
                                        Location
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g. GMRIT Campus, Rajam"
                                        value={location}
                                        onChange={(e) => setLocation(e.target.value)}
                                        className="ncc-input text-xs"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-ncc-navy dark:text-white mb-1">
                                        Date
                                    </label>
                                    <input
                                        type="date"
                                        value={date}
                                        onChange={(e) => setDate(e.target.value)}
                                        className="ncc-input text-xs"
                                    />
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#ddd8cc] dark:border-white/10">
                                <button
                                    type="button"
                                    onClick={() => setIsUploading(false)}
                                    className="px-5 py-2.5 rounded-xl border border-gray-300 dark:border-white/20 text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-white/80 hover:bg-gray-100 dark:hover:bg-white/10 transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting || !photoPreview}
                                    className="flex items-center gap-2 px-6 py-2.5 bg-ncc-navy text-white dark:bg-ncc-gold dark:text-ncc-navy font-bold rounded-xl text-xs uppercase tracking-widest hover:scale-105 transition shadow-md disabled:opacity-50"
                                >
                                    {submitting ? <Loader className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                                    {submitting ? 'Uploading...' : 'Publish to Gallery'}
                                </button>
                            </div>
                        </form>
                    </div>
                </ModalOverlay>
            )}

            {/* ── Interactive Fullscreen Lightbox Modal ── */}
            {selectedImage && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 select-none animate-in fade-in duration-200">
                    <div 
                        className="absolute inset-0 bg-black/95 backdrop-blur-md"
                        onClick={() => setSelectedImage(null)}
                    />

                    {/* Top Action Bar */}
                    <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-30 pointer-events-auto">
                        <div className="flex items-center gap-3">
                            <span className="px-3.5 py-1.5 rounded-full bg-white/10 text-white text-xs font-bold backdrop-blur-md">
                                {currentLightboxIndex !== -1 ? `${currentLightboxIndex + 1} / ${filteredImages.length}` : '1 / 1'}
                            </span>
                            <span className="hidden sm:inline-block text-white/60 text-xs font-medium">
                                Use ← / → arrow keys to browse
                            </span>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={(e) => handleDownloadImage(selectedImage, e)}
                                title="Download Full Resolution"
                                className="px-4 py-2 bg-white/10 hover:bg-ncc-gold hover:text-ncc-navy text-white rounded-2xl flex items-center gap-2 text-xs font-bold transition backdrop-blur-md"
                            >
                                <Download className="w-4 h-4" />
                                <span className="hidden sm:inline">Download</span>
                            </button>
                            <button 
                                onClick={() => setSelectedImage(null)}
                                title="Close (Esc)"
                                className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-2xl flex items-center justify-center text-white transition backdrop-blur-md"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Left Navigation Chevron */}
                    {currentLightboxIndex > 0 && (
                        <button
                            onClick={showPrevImage}
                            title="Previous Photo (Left Arrow)"
                            className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-2xl bg-white/10 hover:bg-white/25 text-white flex items-center justify-center transition backdrop-blur-md z-30 shadow-2xl hover:scale-110"
                        >
                            <ChevronLeft className="w-6 h-6" />
                        </button>
                    )}

                    {/* Right Navigation Chevron */}
                    {currentLightboxIndex !== -1 && currentLightboxIndex < filteredImages.length - 1 && (
                        <button
                            onClick={showNextImage}
                            title="Next Photo (Right Arrow)"
                            className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-2xl bg-white/10 hover:bg-white/25 text-white flex items-center justify-center transition backdrop-blur-md z-30 shadow-2xl hover:scale-110"
                        >
                            <ChevronRight className="w-6 h-6" />
                        </button>
                    )}
                    
                    {/* Main Image and Metadata Container */}
                    <div className="relative max-w-5xl w-full max-h-[88vh] flex flex-col items-center justify-center z-20 pointer-events-auto">
                        <div className="relative max-h-[70vh] flex items-center justify-center">
                            <img 
                                src={selectedImage.url} 
                                alt={selectedImage.title} 
                                className="max-w-full max-h-[70vh] object-contain rounded-2xl shadow-2xl"
                            />
                        </div>

                        {/* Metadata Footer */}
                        <div className="mt-4 w-full max-w-2xl bg-white/10 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-white/10 text-center">
                            <h3 className="text-white text-lg sm:text-xl font-display font-bold leading-snug drop-shadow">
                                {selectedImage.title}
                            </h3>
                            <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 mt-2 text-white/80 text-xs font-semibold uppercase tracking-wider">
                                <span className="flex items-center gap-1.5">
                                    <Calendar className="w-3.5 h-3.5 text-ncc-gold" /> {selectedImage.date}
                                </span>
                                <span className="flex items-center gap-1.5">
                                    <MapPin className="w-3.5 h-3.5 text-ncc-gold" /> {selectedImage.location}
                                </span>
                                {selectedImage.uploaderName && (
                                    <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full bg-ncc-gold/20 text-ncc-gold text-[10px] font-bold">
                                        Added by {selectedImage.uploaderName}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
