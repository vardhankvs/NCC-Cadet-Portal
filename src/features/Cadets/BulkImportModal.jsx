// src/features/Cadets/BulkImportModal.jsx
import React, { useState } from 'react';
import { ModalOverlay } from '../../components/ui/ModalOverlay.jsx';
import { ErrorDisplay } from '../../components/ui/ErrorDisplay.jsx';
import { XCircle, Loader, UserPlus } from '../../components/Icons.jsx';
import { bulkAddCadets } from '../../firebase/firestoreService.js';
import Papa from 'papaparse';
import { toast } from 'react-toastify';

export const BulkImportModal = ({ onClose }) => {
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [formError, setFormError] = useState(null);

    // treats the permanent address as one single long header string and uses CERT
    const REQUIRED_HEADERS = [
        'name',
        'regimental number',
        'jntu no',
        'rank',
        'cert',
        'father name',
        'mother name',
        'year',
        'branch',
        'aadhaar number',
        'phone number (personal)',
        'phone number (parents)',
        'address (present)',
        'address (permanent) if both present & permanent are same just ignore',
        'hosteler / days scholar',
        'eca/cca',
        'date of birth',
        'email id (personal)',
        'email id (college mail)',
        'blood group',
    ];

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (
            selectedFile &&
            (selectedFile.type === 'text/csv' ||
                selectedFile.name.endsWith('.csv'))
        ) {
            setFile(selectedFile);
            setFormError(null);
        } else {
            setFile(null);
            setFormError('Please select a valid .csv file.');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!file) {
            setFormError('No file selected.');
            return;
        }

        setLoading(true);
        setFormError(null);

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            // Normalize headers from CSV (remove newlines and extra spaces)
            transformHeader: (h) => h.replace(/\s+/g, ' ').trim().toLowerCase(),
            complete: async (results) => {
                const cadets = results.data;

                if (!cadets || cadets.length === 0) {
                    setFormError('File is empty or invalid.');
                    setLoading(false);
                    return;
                }

                const headers = Object.keys(cadets[0]);
                const missingHeaders = REQUIRED_HEADERS.filter(
                    (h) => !headers.includes(h)
                );

                if (missingHeaders.length > 0) {
                    setFormError(
                        `File is missing required columns: ${missingHeaders.join(', ')}`
                    );
                    setLoading(false);
                    return;
                }

                try {
                    const addedCount = await bulkAddCadets(cadets);
                    toast.success(
                        `Successfully imported ${addedCount} new cadets!`
                    );
                    setLoading(false);
                    onClose();
                } catch (e) {
                    setFormError(`Import failed: ${e.message}`);
                    setLoading(false);
                }
            },
            error: (err) => {
                setFormError(`CSV Parsing Error: ${err.message}`);
                setLoading(false);
            },
        });
    };

    return (
        <ModalOverlay>
            <form
                onSubmit={handleSubmit}
                className="p-6 bg-white rounded-xl shadow-2xl w-full max-w-lg mx-auto"
            >
                <div className="flex justify-between items-center mb-6 border-b pb-3">
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                        <UserPlus className="w-6 h-6 mr-2 text-indigo-600" />{' '}
                        Bulk Cadet Import
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

                <div className="text-sm text-gray-700 mb-4">
                    <p className="font-semibold mb-1">
                        Upload a CSV file with the exact headers:
                    </p>
                    <div className="bg-gray-100 p-2 rounded text-xs font-mono break-all border border-gray-200 uppercase">
                        {REQUIRED_HEADERS.join(', ')}
                    </div>
                </div>

                <div className="mb-4">
                    <label
                        htmlFor="csv-file-input"
                        className="block text-sm font-medium text-gray-700 mb-1"
                    >
                        CSV File <span className="text-red-500">*</span>
                    </label>
                    <input
                        id="csv-file-input"
                        type="file"
                        accept=".csv"
                        onChange={handleFileChange}
                        required
                        className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                    />
                </div>

                <div className="flex justify-end space-x-4 mt-6">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={loading}
                        className="px-4 py-2 text-sm bg-gray-200 rounded hover:bg-gray-300"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={loading || !file}
                        className="px-6 py-2 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:bg-indigo-300 flex items-center"
                    >
                        {loading ? (
                            <>
                                <Loader className="animate-spin w-4 h-4 mr-2" />
                                Processing...
                            </>
                        ) : (
                            'Import Cadets'
                        )}
                    </button>
                </div>
            </form>
        </ModalOverlay>
    );
};
