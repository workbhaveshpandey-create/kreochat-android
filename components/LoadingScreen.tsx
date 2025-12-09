import React from 'react';
import { motion } from 'framer-motion';

const LoadingScreen: React.FC = () => {
    return (
        <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
            className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#0b141a] text-white"
        >
            <div className="relative flex flex-col items-center">
                {/* Logo / Text Animation */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="mb-12 text-center"
                >
                    <h1 className="text-4xl md:text-5xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-500 mb-2">
                        KreoChat
                    </h1>
                    <p className="text-white/40 text-sm tracking-[0.2em] uppercase">Secure Encrypted Messaging</p>
                </motion.div>

                {/* Premium Slider (Progress Bar) */}
                <div className="relative w-64 h-1 bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                        className="absolute top-0 left-0 h-full bg-gradient-to-r from-emerald-500 via-cyan-500 to-blue-500 w-full rounded-full"
                        initial={{ x: '-100%' }}
                        animate={{ x: '100%' }}
                        transition={{
                            repeat: Infinity,
                            duration: 1.5,
                            ease: "easeInOut",
                            repeatDelay: 0.5
                        }}
                    />
                </div>
            </div>

            {/* Encryption Footer */}
            <motion.div
                className="absolute bottom-8 flex flex-col items-center gap-2 text-emerald-500/80"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
            >
                <div className="flex items-center gap-2 text-sm font-medium">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                        <path fillRule="evenodd" d="M12 1.5a5.25 5.25 0 00-5.25 5.25v3a3 3 0 00-3 3v6.75a3 3 0 003 3h10.5a3 3 0 003-3v-6.75a3 3 0 00-3-3v-3c0-2.9-2.35-5.25-5.25-5.25zm3.75 8.25v-3a3.75 3.75 0 10-7.5 0v3h7.5z" clipRule="evenodd" />
                    </svg>
                    <span>End-to-end encrypted</span>
                </div>
            </motion.div>
        </motion.div>
    );
};

export default LoadingScreen;
