// src/features/Announcements/AnnouncementForm.jsx
import React, { useState } from 'react';
import { ModalOverlay } from '../../components/ui/ModalOverlay.jsx';
import { InputField } from '../../components/ui/InputField.jsx';
import { ErrorDisplay } from '../../components/ui/ErrorDisplay.jsx';
import { XCircle, Loader, Megaphone } from '../../components/Icons.jsx';
import { saveAnnouncement } from '../../firebase/firestoreService.js';

export const AnnouncementForm = ({ onClose }) => {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [formError, setFormError] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormError(null);
        if (!title || !content) {
            setFormError('Title and Content are required.');
            return;
        }

        setLoading(true);
        try {
            await saveAnnouncement(title, content);
            onClose(); // Close modal on success
        } catch (e) {
            setFormError(`Failed to save announcement: ${e.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <ModalOverlay>
            <form
                onSubmit={handleSubmit}
                className="mx-auto w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl"
            >
                <div className="mb-6 flex items-center justify-between border-b pb-3">
                    <h2 className="flex items-center text-2xl font-bold text-gray-900">
                        <Megaphone className="mr-2 h-6 w-6 text-indigo-600" />{' '}
                        New Announcement
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        title="Close"
                        className="text-gray-400 hover:text-gray-600"
                    >
                        <XCircle className="h-6 w-6" />
                    </button>
                </div>
                {formError && (
                    <div className="mb-4">
                        <ErrorDisplay message={formError} />
                    </div>
                )}

                <InputField
                    label="Title"
                    name="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                />
                <InputField
                    label="Content"
                    name="content"
                    type="textarea"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    required
                />

                <div className="mt-6 flex justify-end space-x-4">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={loading}
                        className="rounded bg-gray-200 px-4 py-2 text-sm transition hover:bg-gray-300 disabled:bg-gray-100"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="flex items-center rounded bg-indigo-600 px-6 py-2 text-sm text-white transition hover:bg-indigo-700 disabled:bg-indigo-300"
                    >
                        {loading ? (
                            <Loader className="mr-2 h-4 w-4 animate-spin" />
                        ) : null}
                        {loading ? 'Posting...' : 'Post Announcement'}
                    </button>
                </div>
            </form>
        </ModalOverlay>
    );
};
