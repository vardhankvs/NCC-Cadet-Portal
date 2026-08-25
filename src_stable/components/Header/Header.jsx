// src/components/Header/Header.jsx
import React from 'react';
import { useAuthContext } from '../../context/AuthContext.jsx'; // Adjust path if needed
import { LogOut } from '../Icons.jsx'; // Adjust path if needed
// --- REMOVED: import NccLogo from '../../assets/ncc_logo.jpg'; ---

export const Header = () => {
    // Get the logout function from your authentication context
    const { handleLogout } = useAuthContext();

    return (
        <header className="mb-8 p-4 bg-white rounded-xl shadow-lg flex items-center justify-between">
            {/* Left side: Placeholder Box and Title */}
            <div className="flex items-center space-x-3">
                {/* --- REVERTED TO PLACEHOLDER BOX --- */}
                <div className="w-12 h-12 bg-indigo-600 flex items-center justify-center rounded-md text-white font-bold text-lg">
                    NCC
                </div>
                {/* --- END PLACEHOLDER --- */}
                <h1 className="text-3xl font-extrabold text-indigo-700">
                    14(A) BN NCC
                </h1>
            </div>

            {/* Right side: Logout Button */}
            <button
                onClick={handleLogout}
                className="flex items-center px-4 py-2 text-sm font-medium text-red-600 bg-red-100 rounded-lg shadow-sm hover:bg-red-200 transition duration-150"
            >
                <LogOut className="w-4 h-4 mr-1.5" /> Logout
            </button>
        </header>
    );
};

// If you don't export as default, ensure the import in Dashboard.jsx uses { Header }
// export default Header;
