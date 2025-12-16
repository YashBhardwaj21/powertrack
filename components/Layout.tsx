
import React from 'react';
import { Sun, Menu, Github, LayoutDashboard, School, BarChart3 } from 'lucide-react';
import { NavLink, Link } from 'react-router-dom';

interface LayoutProps {
    children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
    
    const navItems = [
        { path: '/', label: 'Dashboard', icon: LayoutDashboard },
        { path: '/schools', label: 'Schools', icon: School },
        { path: '/analytics', label: 'Analytics', icon: BarChart3 },
    ];

    return (
        <div className="min-h-screen flex flex-col font-sans">
            {/* Navigation */}
            <header className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur-sm text-white border-b border-slate-700 shadow-lg">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16 items-center">
                        <Link to="/" className="flex items-center gap-3 cursor-pointer">
                            <div className="bg-blue-600 p-2 rounded-lg">
                                <Sun className="w-6 h-6 text-yellow-300" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-300">
                                    PowerTrack
                                </h1>
                                <p className="text-[10px] text-slate-400 uppercase tracking-wider">West Java Solar</p>
                            </div>
                        </Link>
                        
                        <nav className="hidden md:flex gap-1 text-sm font-medium text-slate-300">
                            {navItems.map((item) => (
                                <NavLink
                                    key={item.path}
                                    to={item.path}
                                    className={({ isActive }) => `px-4 py-2 rounded-lg flex items-center gap-2 transition-all duration-200 ${
                                        isActive 
                                            ? 'bg-slate-800 text-white shadow-sm ring-1 ring-slate-700' 
                                            : 'hover:bg-slate-800/50 hover:text-white'
                                    }`}
                                >
                                    {({ isActive }) => (
                                        <>
                                            <item.icon className={`w-4 h-4 ${isActive ? 'text-blue-400' : 'text-slate-500'}`} />
                                            {item.label}
                                        </>
                                    )}
                                </NavLink>
                            ))}
                        </nav>

                        <div className="flex items-center gap-2">
                            <button className="md:hidden p-2 text-slate-400 hover:text-white">
                                <Menu className="w-6 h-6" />
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-grow py-8 px-4 sm:px-6 lg:px-8 bg-slate-50">
                <div className="max-w-7xl mx-auto">
                    {children}
                </div>
            </main>

            {/* Footer */}
            <footer className="bg-slate-900 text-slate-400 py-12 border-t border-slate-800">
                <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div>
                        <h4 className="text-white font-bold text-lg mb-4">PowerTrack</h4>
                        <p className="text-sm leading-relaxed">
                            Empowering West Java schools with real-time solar energy monitoring and sustainability education.
                        </p>
                    </div>
                    <div>
                        <h4 className="text-white font-bold text-lg mb-4">Quick Links</h4>
                        <ul className="space-y-2 text-sm">
                            <li><Link to="/" className="hover:text-blue-400">Dashboard</Link></li>
                            <li><Link to="/schools" className="hover:text-blue-400">Partner Schools</Link></li>
                            <li><Link to="/analytics" className="hover:text-blue-400">Analytics API</Link></li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="text-white font-bold text-lg mb-4">Connect</h4>
                        <div className="flex gap-4">
                            <a href="#" className="hover:text-white"><Github className="w-5 h-5" /></a>
                        </div>
                        <p className="mt-4 text-xs">© 2024 PowerTrack Platform</p>
                    </div>
                </div>
            </footer>
        </div>
    );
};
