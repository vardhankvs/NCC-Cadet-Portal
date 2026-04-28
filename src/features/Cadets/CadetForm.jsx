// src/features/Cadets/CadetForm.jsx
import React, { useState } from 'react';
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
    User,
} from '../../components/Icons.jsx';
import { saveCadet } from '../../firebase/firestoreService.js';
import { toast } from 'react-toastify';

/**
 * Helper function to convert date strings (like "6/29/2005") to YYYY-MM-DD.
 * This is strictly required for <input type="date"> to display the value.
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

export const CadetForm = ({ currentCadet, onSaveSuccess, onCancel }) => {
    const isEditMode = !!currentCadet;

    const [formData, setFormData] = useState({
        name: currentCadet?.name || '',
        enrollmentId:
            currentCadet?.enrollmentId || currentCadet?.regimentalNumber || '',
        jntuNo: currentCadet?.jntuNo || '',
        rank: currentCadet?.rank || 'CDT',
        certificate: currentCadet?.certificate || currentCadet?.B || 'NA',
        fatherName: currentCadet?.fatherName || '',
        motherName: currentCadet?.motherName || '',
        year: currentCadet?.year || '',
        branch: currentCadet?.branch || '',
        aadhaarNumber: currentCadet?.aadhaarNumber || '',
        phonePersonal: currentCadet?.phonePersonal || currentCadet?.phone || '',
        phoneParents: currentCadet?.phoneParents || '',
        personalEmail: currentCadet?.personalEmail || '',
        collegeEmail: currentCadet?.collegeEmail || '',
        bloodGroup: currentCadet?.bloodGroup || '',
        addressPresent:
            currentCadet?.addressPresent || currentCadet?.address || '',
        addressPermanent: currentCadet?.addressPermanent || '',
        hostelerType: currentCadet?.hostelerType || 'Days scholar',
        ecaCca: currentCadet?.ecaCca || '',
        // FIX: Formats the date string so the browser input can display it
        dob: formatDateForInput(currentCadet?.dob),
    });

    const [formError, setFormError] = useState(null);
    const [loading, setLoading] = useState(false);

    const ranks = ['CDT', 'LCPL', 'CPL', 'SGT', 'CSM', 'JUO', 'SUO'];
    const certificates = ['NA', 'B1', 'B2', 'C'];
    const hostelerOptions = ['Days scholar', 'Hosteler'];
    const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormError(null);

        // Required field validation ONLY applies when adding a NEW cadet.
        // In Edit Mode, all fields are now treated as optional.
        if (!isEditMode && (!formData.name || !formData.enrollmentId)) {
            setFormError(
                'Name and Regimental Number are required for new entries.'
            );
            return;
        }

        setLoading(true);
        try {
            await saveCadet(formData, currentCadet?.id);
            toast.success(
                isEditMode
                    ? 'Cadet updated successfully!'
                    : 'Cadet added successfully!'
            );
            onSaveSuccess();
        } catch (e) {
            setFormError(e.message);
            toast.error(`Error: ${e.message}`);
            setLoading(false);
        }
    };

    return (
        <form
            onSubmit={handleSubmit}
            className="p-6 bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-auto max-h-[90vh] overflow-y-auto"
        >
            <div className="flex justify-between items-center mb-6 border-b pb-3 sticky top-0 bg-white z-10">
                <h2 className="text-2xl font-bold text-gray-900">
                    {isEditMode ? 'Edit Cadet' : 'Add Cadet'}
                </h2>
                <button type="button" onClick={onCancel} title="Close">
                    <XCircle className="w-6 h-6 text-gray-400 hover:text-gray-600" />
                </button>
            </div>

            {formError && (
                <div className="mb-4">
                    <ErrorDisplay message={formError} />
                </div>
            )}

            <h3 className="text-lg font-semibold text-indigo-700 mb-3 border-l-4 border-indigo-600 pl-2">
                Core Identity
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
                <InputField
                    label="Name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    icon={User}
                    // Required removed for optional edit
                    required={!isEditMode}
                />
                <InputField
                    label="Regimental Number"
                    name="enrollmentId"
                    value={formData.enrollmentId}
                    onChange={handleChange}
                    // Required removed for optional edit
                    required={!isEditMode}
                />
                <InputField
                    label="JNTU No."
                    name="jntuNo"
                    value={formData.jntuNo}
                    onChange={handleChange}
                    icon={List}
                />
                <div className="grid grid-cols-2 gap-2">
                    <SelectField
                        label="Rank"
                        name="rank"
                        value={formData.rank}
                        options={ranks}
                        onChange={handleChange}
                    />
                    <SelectField
                        label="CERT"
                        name="certificate"
                        value={formData.certificate}
                        options={certificates}
                        onChange={handleChange}
                    />
                </div>
            </div>

            <h3 className="text-lg font-semibold text-indigo-700 mt-6 mb-3 border-l-4 border-indigo-600 pl-2">
                Family & Identity
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
                <InputField
                    label="Father Name"
                    name="fatherName"
                    value={formData.fatherName}
                    onChange={handleChange}
                />
                <InputField
                    label="Mother Name"
                    name="motherName"
                    value={formData.motherName}
                    onChange={handleChange}
                />
                <InputField
                    label="Aadhaar Number"
                    name="aadhaarNumber"
                    value={formData.aadhaarNumber}
                    onChange={handleChange}
                />
                <InputField
                    label="Date of Birth"
                    name="dob"
                    type="date"
                    value={formData.dob}
                    onChange={handleChange}
                />
            </div>

            <h3 className="text-lg font-semibold text-indigo-700 mt-6 mb-3 border-l-4 border-indigo-600 pl-2">
                Academic & Contact
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
                <InputField
                    label="Year"
                    name="year"
                    value={formData.year}
                    onChange={handleChange}
                />
                <InputField
                    label="Branch"
                    name="branch"
                    value={formData.branch}
                    onChange={handleChange}
                    icon={Briefcase}
                />
                <InputField
                    label="Personal Email"
                    name="personalEmail"
                    type="email"
                    value={formData.personalEmail}
                    onChange={handleChange}
                    icon={Mail}
                />
                <InputField
                    label="College Email"
                    name="collegeEmail"
                    type="email"
                    value={formData.collegeEmail}
                    onChange={handleChange}
                    icon={Mail}
                />
                <InputField
                    label="Phone (Personal)"
                    name="phonePersonal"
                    type="tel"
                    value={formData.phonePersonal}
                    onChange={handleChange}
                    icon={Phone}
                />
                <InputField
                    label="Phone (Parents)"
                    name="phoneParents"
                    type="tel"
                    value={formData.phoneParents}
                    onChange={handleChange}
                    icon={Phone}
                />
            </div>

            <h3 className="text-lg font-semibold text-indigo-700 mt-6 mb-3 border-l-4 border-indigo-600 pl-2">
                Medical & Status
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
                <SelectField
                    label="Blood Group"
                    name="bloodGroup"
                    value={formData.bloodGroup}
                    options={bloodGroups}
                    onChange={handleChange}
                />
                <SelectField
                    label="Hosteler Status"
                    name="hostelerType"
                    value={formData.hostelerType}
                    options={hostelerOptions}
                    onChange={handleChange}
                />
                <InputField
                    label="ECA/CCA"
                    name="ecaCca"
                    value={formData.ecaCca}
                    onChange={handleChange}
                />
                <div className="hidden sm:block"></div>
                <InputField
                    label="Address (Present)"
                    name="addressPresent"
                    type="textarea"
                    value={formData.addressPresent}
                    onChange={handleChange}
                    className="sm:col-span-2"
                />
                <InputField
                    label="Address (Permanent)"
                    name="addressPermanent"
                    type="textarea"
                    value={formData.addressPermanent}
                    onChange={handleChange}
                    className="sm:col-span-2"
                />
            </div>

            <div className="flex justify-end space-x-4 mt-8 pt-4 border-t sticky bottom-0 bg-white z-10">
                <button
                    type="button"
                    onClick={onCancel}
                    disabled={loading}
                    className="px-4 py-2 text-sm bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-2 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:bg-indigo-300 flex items-center shadow-md"
                >
                    {loading ? (
                        <Loader className="animate-spin w-4 h-4 mr-2" />
                    ) : isEditMode ? (
                        'Update Cadet'
                    ) : (
                        'Add Cadet'
                    )}
                </button>
            </div>
        </form>
    );
};
