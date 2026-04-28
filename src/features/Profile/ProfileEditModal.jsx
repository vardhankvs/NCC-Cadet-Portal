// src/features/Profile/ProfileEditModal.jsx
import React, { useState, useEffect } from 'react';
import { ModalOverlay } from '../../components/ui/ModalOverlay.jsx';
import { InputField } from '../../components/ui/InputField.jsx';
import { SelectField } from '../../components/ui/SelectField.jsx';
import { ErrorDisplay } from '../../components/ui/ErrorDisplay.jsx';
import {
    XCircle,
    Loader,
    Mail,
    Phone,
    List,
    Briefcase,
    Image as ImageIcon,
    Trash2,
    Calendar,
    Droplet,
    MapPin,
} from '../../components/Icons.jsx';
import { updateCadetContactInfo } from '../../firebase/firestoreService.js';
import { toast } from 'react-toastify';

/**
 * Helper function to convert various date string formats to YYYY-MM-DD.
 * This is strictly required for <input type="date"> to display a value.
 */
const formatDateForInput = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
};

/**
 * ProfileEditModal
 *
 * Allows cadets to edit contact info, JNTU No, branch, and profile details.
 */
export const ProfileEditModal = ({ cadet, onClose, onSaveSuccess }) => {
    // Editable fields - Standardized to match database schema
    const [email, setEmail] = useState(cadet.personalEmail || '');
    // Standardized to phonePersonal to match firestoreService payload requirements
    const [phonePersonal, setPhonePersonal] = useState(
        cadet.phonePersonal || cadet.phone || ''
    );
    const [jntuNo, setJntuNo] = useState(cadet.jntuNo || '');
    const [branch, setBranch] = useState(cadet.branch || '');

    // FIX: Format the date so the HTML input can read it
    const [dob, setDob] = useState(formatDateForInput(cadet.dob));

    const [bloodGroup, setBloodGroup] = useState(cadet.bloodGroup || '');
    const [addressPresent, setAddressPresent] = useState(
        cadet.addressPresent || ''
    );

    // Photo states
    const [photoUrl, setPhotoUrl] = useState(cadet.photoUrl || '');
    const [photoPreview, setPhotoPreview] = useState(cadet.photoUrl || '');
    const [photoFileName, setPhotoFileName] = useState('');

    const [formError, setFormError] = useState(null);
    const [loading, setLoading] = useState(false);

    const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];

    // Refresh state when cadet prop updates
    useEffect(() => {
        setEmail(cadet.personalEmail || '');
        setPhonePersonal(cadet.phonePersonal || cadet.phone || '');
        setJntuNo(cadet.jntuNo || '');
        setBranch(cadet.branch || '');

        // FIX: Format the date when the cadet data loads
        setDob(formatDateForInput(cadet.dob));

        setBloodGroup(cadet.bloodGroup || '');
        setAddressPresent(cadet.addressPresent || '');
        setPhotoUrl(cadet.photoUrl || '');
        setPhotoPreview(cadet.photoUrl || '');
        setPhotoFileName('');
    }, [cadet]);

    const handleFileChange = (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            setFormError('Please choose a valid image file.');
            return;
        }

        setFormError(null);
        setPhotoFileName(file.name);

        const reader = new FileReader();
        reader.onload = (ev) => {
            const dataUrl = ev.target.result;
            setPhotoPreview(dataUrl);
            setPhotoUrl(dataUrl);
        };
        reader.readAsDataURL(file);
    };

    const handleRemoveSelectedPhoto = () => {
        setPhotoFileName('');
        setPhotoPreview('');
        setPhotoUrl('');
        const fileInput = document.getElementById('profile-photo-file-input');
        if (fileInput) fileInput.value = '';
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormError(null);

        if (!email || !email.trim()) {
            setFormError('Please enter your personal email address.');
            return;
        }

        setLoading(true);
        try {
            const contactData = {
                personalEmail: email.trim(),
                phonePersonal: phonePersonal.trim(), // Standardized key for database sync
                jntuNo: jntuNo.trim(),
                branch: branch.trim(),
                dob: dob,
                bloodGroup: bloodGroup,
                addressPresent: addressPresent.trim(),
                photoUrl: photoUrl || '',
            };

            await updateCadetContactInfo(cadet.id, contactData);
            toast.success('Profile updated successfully!');

            // Safety check for onSaveSuccess prop
            if (typeof onSaveSuccess === 'function') {
                onSaveSuccess();
            }

            onClose();
        } catch (err) {
            const message = err?.message || String(err);
            setFormError(`Update failed: ${message}`);
            toast.error(`Update failed: ${message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <ModalOverlay>
            <form
                onSubmit={handleSubmit}
                className="p-6 bg-white rounded-xl shadow-2xl w-full max-w-lg mx-auto max-h-[90vh] overflow-y-auto"
            >
                <div className="flex justify-between items-center mb-6 border-b pb-3 sticky top-0 bg-white z-10">
                    <h2 className="text-2xl font-bold text-gray-900">
                        Edit My Info
                    </h2>
                    <button type="button" onClick={onClose} title="Close">
                        <XCircle className="w-6 h-6 text-gray-400 hover:text-gray-600" />
                    </button>
                </div>

                {formError && (
                    <div className="mb-4">
                        <ErrorDisplay message={formError} />
                    </div>
                )}

                <p className="text-sm text-gray-600 mb-4">
                    Update your personal contact and academic information.
                </p>

                {/* Photo Section - Accessibility fix: htmlFor associated with input ID */}
                <div className="mb-4 grid grid-cols-1 sm:grid-cols-3 gap-4 items-center bg-gray-50 p-4 rounded-lg">
                    <div className="sm:col-span-2">
                        <label
                            htmlFor="profile-photo-file-input"
                            className="block text-sm font-semibold text-gray-700 mb-1"
                        >
                            Profile Photo (optional)
                        </label>
                        <div className="flex items-center space-x-2">
                            <button
                                type="button"
                                onClick={() =>
                                    document
                                        .getElementById(
                                            'profile-photo-file-input'
                                        )
                                        .click()
                                }
                                className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md bg-white text-sm font-medium hover:bg-gray-50 shadow-sm"
                            >
                                <ImageIcon className="w-4 h-4 mr-2" />
                                {photoFileName
                                    ? 'Change Photo'
                                    : 'Upload Photo'}
                            </button>
                        </div>

                        <input
                            id="profile-photo-file-input"
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            className="hidden"
                        />

                        {photoFileName && (
                            <div className="mt-2 text-xs text-gray-600">
                                Selected:{' '}
                                <span className="font-medium">
                                    {photoFileName}
                                </span>
                                <button
                                    type="button"
                                    onClick={handleRemoveSelectedPhoto}
                                    className="ml-2 inline-flex items-center px-2 py-1 text-xs text-red-600 hover:underline"
                                >
                                    <Trash2 className="w-4 h-4 mr-1" /> Remove
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="flex justify-center sm:justify-end">
                        <div className="w-24 h-24 rounded-full bg-indigo-50 flex items-center justify-center overflow-hidden border-2 border-white shadow-md">
                            {photoPreview ? (
                                <img
                                    src={photoPreview}
                                    alt="profile preview"
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                        e.currentTarget.onerror = null;
                                        setPhotoPreview('');
                                    }}
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-indigo-100 text-indigo-700 font-bold text-xl">
                                    {cadet.name
                                        ? cadet.name
                                              .split(' ')
                                              .map((n) => n[0])
                                              .slice(0, 2)
                                              .join('')
                                              .toUpperCase()
                                        : '—'}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <InputField
                        id="personal-email-input"
                        label="Personal Email"
                        name="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required={true}
                        placeholder="your.email@gmail.com"
                        icon={Mail}
                    />
                    <InputField
                        id="phone-number-input"
                        label="Phone Number"
                        name="phonePersonal"
                        type="tel"
                        value={phonePersonal}
                        onChange={(e) => setPhonePersonal(e.target.value)}
                        required={false}
                        placeholder="9876543210"
                        icon={Phone}
                    />
                    <InputField
                        id="jntu-no-input"
                        label="JNTU No."
                        name="jntuNo"
                        type="text"
                        value={jntuNo}
                        onChange={(e) => setJntuNo(e.target.value)}
                        required={false}
                        placeholder="e.g., 23341A05A7"
                        icon={List}
                    />
                    <InputField
                        id="branch-input"
                        label="Branch"
                        name="branch"
                        type="text"
                        value={branch}
                        onChange={(e) => setBranch(e.target.value)}
                        required={false}
                        placeholder="e.g., CSE"
                        icon={Briefcase}
                    />
                    <InputField
                        id="dob-input"
                        label="Date of Birth"
                        name="dob"
                        type="date"
                        value={dob}
                        onChange={(e) => setDob(e.target.value)}
                        required={false}
                        icon={Calendar}
                    />
                    <SelectField
                        label="Blood Group"
                        name="bloodGroup"
                        id="bloodGroup"
                        value={bloodGroup}
                        options={bloodGroups}
                        onChange={(e) => setBloodGroup(e.target.value)}
                        icon={Droplet}
                    />
                </div>

                <div className="mt-4">
                    <InputField
                        id="address-present-input"
                        label="Present Address"
                        name="addressPresent"
                        type="textarea"
                        value={addressPresent}
                        onChange={(e) => setAddressPresent(e.target.value)}
                        required={false}
                        placeholder="Enter your present address"
                        icon={MapPin}
                    />
                </div>

                <div className="flex justify-end space-x-4 mt-8 pt-4 border-t sticky bottom-0 bg-white">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={loading}
                        className="px-4 py-2 text-sm bg-gray-200 rounded hover:bg-gray-300 disabled:bg-gray-100 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="px-6 py-2 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:bg-indigo-300 flex items-center shadow-md transition-colors"
                    >
                        {loading ? (
                            <Loader className="animate-spin w-4 h-4 mr-2" />
                        ) : (
                            'Save Changes'
                        )}
                    </button>
                </div>
            </form>
        </ModalOverlay>
    );
};
