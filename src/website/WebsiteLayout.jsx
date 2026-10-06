import { useState, useEffect } from 'react';
import { NavLink, Link, Outlet, useLocation } from 'react-router-dom';
import { marketingAPI } from '../services/api';
import logoImg from '../assets/WhatsApp Image 2026-04-13 at 11.01.36 AM-Photoroom.png';

function PublicNavbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Handle Hash Scrolling
  useEffect(() => {
    if (location.hash) {
      const id = location.hash.replace('#', '');
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    } else if (location.pathname === '/') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    setIsOpen(false); // Close mobile menu on every navigation
  }, [location]);

  const navLinks = [
    { label: 'HOME', path: '/#home' },
    { label: 'ABOUT', path: '/#our-firm' },
    { label: 'PRACTICE AREAS', path: '/#practice-areas' },
    { label: 'CONTACT', path: '/#contact-us' },
    { label: 'CONSULTATION', path: '/#book-consultation' },
  ];

  return (
    <nav className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-300 ${scrolled ? 'bg-[#111520]/95 backdrop-blur-md py-2 sm:py-2.5 shadow-xl border-b border-white/5' : 'bg-transparent py-2.5 sm:py-4'}`}>
      <div className="max-w-[1600px] mx-auto px-4 sm:px-10 lg:px-12 flex items-center justify-between gap-3">
        {/* Branding */}
        <Link to="/" className="flex items-center gap-3 group">
          <img src={logoImg} alt="Victoria Tulsidas Law" className="h-16 sm:h-20 w-auto object-contain group-hover:scale-105 transition-transform drop-shadow-md" />
          <div className="hidden sm:block">
            <span className="text-white font-display font-900 text-xl tracking-tight leading-none block">Victoria Tulsidas Law</span>
            <span className="text-white font-700 block mt-1 uppercase tracking-[0.25em] opacity-90 text-[10px]">A Professional Legal Corporation</span>
          </div>
        </Link>

        {/* Desktop Links */}
        <div className="hidden lg:flex items-center gap-8">
          {navLinks.map(link => (
            <NavLink key={link.path} to={link.path}
              className={({ isActive }) => `text-[13px] font-900 uppercase tracking-widest transition-all duration-300 ${isActive ? 'text-white' : 'text-white/70 hover:text-white'}`}>
              {link.label}
            </NavLink>
          ))}
          <Link to="/login" className="bg-primary-600 text-white px-6 py-3 rounded-xl text-[13px] font-900 uppercase tracking-wider hover:bg-primary-700 transition-all shadow-lg shadow-primary-600/20 active:scale-[0.98]">
            LOGIN
          </Link>
        </div>

        {/* Mobile Toggle */}
        <button onClick={() => setIsOpen(!isOpen)}
          className="lg:hidden w-10 h-10 flex items-center justify-center text-white active:scale-95 transition-transform"
          aria-label="Toggle Menu">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            {isOpen ? <path d="M6 18L18 6M6 6l12 12" /> : <path d="M4 8h16M4 16h16" />}
          </svg>
        </button>
      </div>

      {/* Mobile Menu */}
      <div className={`lg:hidden fixed inset-0 top-0 left-0 w-full h-full bg-[#111520] z-[90] transition-transform duration-500 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex flex-col p-6 sm:p-8 pt-24 sm:pt-32 space-y-6 sm:space-y-8 bg-[#111520] min-h-screen overflow-y-auto">
          {navLinks.map((link, i) => (
            <NavLink key={link.path} to={link.path}
              style={{ transitionDelay: `${i * 50}ms` }}
              className={({ isActive }) => `text-xl sm:text-2xl font-800 tracking-tight transition-all ${isOpen ? 'translate-x-0 opacity-100' : 'translate-x-8 opacity-0'} ${isActive ? 'text-primary-500' : 'text-white hover:text-primary-500'}`}>
              {link.label}
            </NavLink>
          ))}
          <div className={`pt-8 border-t border-white/5 transition-all duration-500 delay-300 ${isOpen ? 'translate-x-0 opacity-100' : 'translate-x-8 opacity-0'}`}>
            <Link to="/login" className="block w-full bg-primary-600 text-white text-center py-5 rounded-2xl font-800 text-lg shadow-2xl shadow-primary-600/30 active:scale-[0.98]">
              Login
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}

const SOCIAL_ICONS = {
  LinkedIn: <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" /></svg>,
  Instagram: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>,
  Facebook: <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" /></svg>,
  YouTube: <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M22.54 6.42a2.78 2.78 0 00-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.42a2.78 2.78 0 00-1.94 2C1 8.14 1 12 1 12s0 3.86.4 5.58a2.78 2.78 0 001.94 2c1.72.42 8.6.42 8.6.42s6.88 0 8.6-.42a2.78 2.78 0 001.94-2C23 15.86 23 12 23 12s0-3.86-.4-5.58zM9.54 15.56V8.45L15.81 12l-6.27 3.56z" /></svg>
};

function PublicFooter() {
  const [dynamicSocialLinks, setDynamicSocialLinks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const fetchLinks = async () => {
      try {
        const res = await marketingAPI.getSocialLinks();
        if (mounted && res.success) {
          setDynamicSocialLinks(res.data || []);
        }
      } catch (err) {
        console.error('Failed to fetch social links:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchLinks();
    return () => { mounted = false; };
  }, []);

  return (
    <footer className="bg-[#111520] border-t border-white/5 py-10 lg:py-16">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-10 lg:px-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-16 mb-10 sm:mb-12">
          {/* Brand Block */}
          <div className="space-y-10">
            <Link to="/" className="flex flex-col gap-4">
              <img src={logoImg} alt="Victoria Tulsidas Law" className="h-20 w-auto object-contain hover:scale-105 transition-all duration-500 mr-auto drop-shadow-md" />
              <div className="leading-tight">
                <span className="text-white font-display font-900 text-xl block tracking-tight">Victoria Tulsidas Law</span>
                <span className="text-slate-400 text-[10px] font-600 block mt-1">A Professional Legal Corporation</span>
              </div>
            </Link>
            <div className="text-slate-400 text-[15px] leading-relaxed font-500 space-y-4">
              <p className="text-pretty">We deliver focused legal advocacy defined by precision, integrity,and disciplined strategy.</p>
              <p className="text-pretty">Based in West Hollywood, serving parties throughout Southern California.</p>
            </div>
            <div className="pt-4">
              <p className="text-primary-500 font-900 text-[13px] uppercase tracking-[0.25em] underline decoration-primary-200/20 underline-offset-[12px] decoration-2 transition-all hover:decoration-primary-500">www.VictoriaTulsidasLaw.com</p>
            </div>
          </div>

          {/* Navigation Links */}
          <div>
            <h4 className="text-white font-900 text-[11px] uppercase tracking-[0.3em] mb-12 leading-none opacity-80">Firm Navigation</h4>
            <div className="flex flex-col gap-6">
              {[
                { label: 'Home', path: '/#home' },
                { label: 'About', path: '/#our-firm' },
                { label: 'Practice Areas', path: '/#practice-areas' },
                { label: 'Contact Us', path: '/#contact-us' },
                { label: 'Public Intake Form', path: '/public-intake' },
                { label: 'Party Login', path: '/login' }
              ].map(link => (
                <Link key={link.label} to={link.path} className="text-white/60 hover:text-primary-400 transition-all text-[15px] font-700 tracking-tight hover:translate-x-1">
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Contact Details */}
          <div>
            <h4 className="text-white font-900 text-[11px] uppercase tracking-[0.3em] mb-10 leading-none">Contact Our Office</h4>
            <div className="space-y-6">
              <div className="flex gap-4 items-start">
                <svg className="w-5 h-5 text-slate-400 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                <p className="text-slate-600 text-[13px] leading-relaxed font-600">
                  750 San Vincente Blvd, Suite 800<br />West Hollywood, CA 90069
                </p>
              </div>
              <div className="flex gap-4 items-center">
                <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                <a href="tel:+13105042359" className="text-white text-[14px] font-800 tracking-tight hover:text-primary-500 transition-colors">(310) 504-2359</a>
              </div>
              <div className="flex gap-4 items-center">
                <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                <a href="mailto:info@victoriatulsidaslaw.com" className="text-white text-[14px] font-800 tracking-tight hover:text-primary-500 transition-colors">info@victoriatulsidaslaw.com</a>
              </div>
              <div className="flex gap-4 items-center">
                <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9-9H3m9 9V3m0 9l-9 9" /></svg>
                <a href="https://www.victoriatulsidaslaw.com" className="text-white text-[14px] font-800 tracking-tight hover:text-primary-500 transition-colors">www.victoriatulsidaslaw.com</a>
              </div>
            </div>
          </div>

          {/* Social Presence */}
          <div>
            <h4 className="text-white font-900 text-[11px] uppercase tracking-[0.3em] mb-12 leading-none opacity-80">Connect with Us</h4>
            <div className="flex flex-col gap-4">
              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="h-14 bg-slate-200/50 rounded-3xl animate-pulse" />
                  ))}
                </div>
              ) : dynamicSocialLinks.length > 0 ? (
                dynamicSocialLinks.map(social => {
                  const hasUrl = social.url && social.url.trim() !== '';
                  return (
                    <a
                      key={social.platform}
                      href={hasUrl ? social.url : undefined}
                      target={hasUrl ? "_blank" : undefined}
                      rel={hasUrl ? "noopener noreferrer" : undefined}
                      className={`flex items-center gap-3 p-4 bg-white/5 border border-white/5 rounded-3xl transition-all group shadow-sm ${hasUrl
                        ? 'hover:border-primary-500/50 hover:bg-white/10 hover:shadow-xl hover:-translate-y-1 cursor-pointer'
                        : 'opacity-50 cursor-not-allowed'
                        }`}
                    >
                      <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:text-primary-600 transition-colors">
                        {SOCIAL_ICONS[social.platform] || <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[11px] font-900 text-slate-500 group-hover:text-primary-800 uppercase tracking-[0.2em]">
                          {social.platform}
                        </span>
                        {!hasUrl && <span className="text-[9px] text-slate-400 font-600 uppercase tracking-widest mt-0.5">Not available</span>}
                      </div>
                    </a>
                  );
                })
              ) : (
                <div className="text-slate-400 text-[11px] font-700 uppercase tracking-widest py-4">No social links configured</div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Banner */}
        <div className="pt-8 sm:pt-10 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-6 sm:gap-8">
          <p className="text-[11px] text-slate-400 font-700 tracking-tight text-center md:text-left leading-relaxed text-pretty">
            © {new Date().getFullYear()}Victoria Tulsidas Law.Submission of any inquiry does not establish an attorney-party relationship.
          </p>
          <div className="flex items-center gap-4 sm:gap-6 text-[10px] font-900 uppercase tracking-[0.3em] text-slate-300 flex-wrap justify-center">
            <span className="hover:text-slate-500 cursor-pointer transition-colors">Security Registry</span>
            <div className="w-1 h-1 bg-slate-300 rounded-full" />
            <span className="hover:text-slate-500 cursor-pointer transition-colors">Privacy Protocol</span>
            <div className="w-1 h-1 bg-slate-300 rounded-full" />
            <span className="hover:text-slate-500 cursor-pointer transition-colors">Terms of Engagement</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default function WebsiteLayout({ toast }) {
  return (
    <div className="min-h-screen flex flex-col bg-[#111520]">
      <PublicNavbar />
      <main className="flex-1 pt-24 sm:pt-28 lg:pt-36 pb-8 sm:pb-12 px-2 sm:px-6 lg:px-10 max-w-[1600px] mx-auto w-full overflow-x-clip">
        <Outlet context={{ toast }} />
      </main>
      <PublicFooter />
    </div>
  );
}
