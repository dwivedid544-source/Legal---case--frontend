import { useState, useEffect } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import api from '../../services/api';
import { formatUSPhone } from '../../utils/adaptiveEngine.js';
import heroSide from '../../assets/36A1870A-7DA7-4C3A-9A48-F7AE4D701041-2.jpeg';
import heroFront from '../../assets/hero_lawyer_modern.png';
import officeImg from '../../assets/office_interior.png';
import lawyerWhatsApp from '../../assets/lawyer_alternate.jpeg';

// ── Interactive Enhancements ──────────────────────────────────────────────
function useScrollReveal() {
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('reveal-visible');
        }
      });
    }, { threshold: 0.1 });

    document.querySelectorAll('.reveal-on-scroll, .reveal-left, .reveal-right').forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);
}



export function HomePage() {
  useScrollReveal();
  const practiceAreas = [
    { title: 'Civil & Business Litigation', icon: <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" /></svg>, desc: '' },
    { title: 'Creative Law', icon: <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>, desc: '' },
    { title: 'International/Immigration Law', icon: <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9-9H3m9 9V3m0 9l-9 9" /></svg>, desc: '' },
    { title: 'Personal Injury/Malpractice/Wrongful Death', icon: <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>, desc: '' }
  ];

  return (
    <div className="animate-fade-in space-y-16 sm:space-y-20 lg:space-y-24 overflow-x-clip relative">

      {/* 1. HERO SECTION */}
      <section id="home" className="relative pt-6 pb-12 sm:pt-10 sm:pb-14 lg:pt-16 lg:pb-20 overflow-hidden scroll-mt-28 sm:scroll-mt-32 reveal-on-scroll">
        <div className="relative z-10 text-center lg:text-left grid lg:grid-cols-2 gap-10 sm:gap-16 items-center">
          <div className="lg:pr-10">
            <h1 className="text-4xl sm:text-5xl lg:text-7xl font-display font-900 text-white mb-6 leading-[1.05] tracking-tight text-balance">
              Where Justice & <span className="text-primary-500">Advocacy Intersect</span>
            </h1>
            <p className="text-white/80 text-lg sm:text-xl max-w-3xl mx-auto lg:mx-0 mb-8 leading-relaxed font-600 text-pretty">
              Refined legal strategy.Global perspective.Results that speak for themselves.
            </p>
            <p className="text-white/80 text-lg sm:text-xl max-w-3xl mx-auto lg:mx-0 mb-8 leading-relaxed font-500 text-pretty">
              Refined,party-centered legal representation grounded in clarity,accessibility and strategic execution.With secure communication and thoughtfully tailored legal approaches we ensure every party receives dedicated advocacy aligned with their unique objectives.
            </p>
            <div className="flex flex-wrap justify-center lg:justify-start gap-3 sm:gap-5">
              <a href="#book-consultation" className="btn btn-primary w-full sm:w-auto justify-center px-6 sm:px-10 py-4 sm:py-5 text-sm sm:text-base font-900 uppercase tracking-wider sm:tracking-widest shadow-2xl shadow-primary-500/30 hover:-translate-y-1 transition-all duration-300">Book a Consultation</a>
              <Link to="/login" className="btn btn-secondary w-full sm:w-auto justify-center px-6 sm:px-10 py-4 sm:py-5 text-sm sm:text-base font-900 uppercase tracking-wider sm:tracking-widest bg-white/5 shadow-md border border-white/10 hover:bg-white/10 hover:-translate-y-1 transition-all duration-300">Access Party Portal</Link>
            </div>
          </div>
          <div className="relative group reveal-right max-w-xl mx-auto lg:ml-auto w-full">
            <div className="absolute -inset-4 bg-primary-600/5 rounded-3xl rotate-3 -z-10 group-hover:rotate-0 transition-transform duration-1000" />
            <div className="relative overflow-hidden rounded-2xl border border-white/10 shadow-2xl bg-[#1a2233]">
              <img
                src={heroFront}
                alt="Victoria Tulsidas - Managing Partner"
                className="w-full h-full object-cover aspect-[4/5] group-hover:scale-105 transition-transform duration-1000"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 via-transparent to-transparent pointer-events-none" />
              <div className="absolute bottom-8 left-8 text-white">
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                  <span className="text-[10px] font-900 uppercase tracking-[0.3em] opacity-80">Attorney at Law</span>
                </div>
                <h3 className="text-xl font-display font-800 mt-2 tracking-tight">Victoria Tulsidas, Esq.</h3>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. OUR FIRM SECTION (Combined from AboutPage) */}
      <section id="our-firm" className="space-y-10 sm:space-y-16 lg:space-y-20 scroll-mt-28 sm:scroll-mt-32 reveal-on-scroll">
        <div className="text-center">

        </div>

        <div className="grid lg:grid-cols-2 gap-10 sm:gap-16 lg:gap-24 items-center">
          <div className="relative group order-2 lg:order-1 reveal-left max-w-xl mx-auto w-full">
            <div className="absolute -inset-4 bg-white/5 rounded-3xl -rotate-2 -z-10 group-hover:rotate-0 transition-transform duration-1000" />
            <div className="relative overflow-hidden rounded-2xl border border-white/10 shadow-2xl bg-[#1a2233]">
              <img
                src={lawyerWhatsApp}
                alt="About Our Firm"
                className="w-full h-full object-cover aspect-[4/5] group-hover:scale-105 transition-transform duration-1000"
              />
            </div>
          </div>
          <div className="space-y-10 order-1 lg:order-2">
            <div className="space-y-6">
              <p className="text-white/80 leading-relaxed text-lg font-500 text-left text-pretty">
                Victoria Tulsidas Law operates at the intersection of advocacy,strategy and global perspective.We represent parties with a disciplined,structured approach,ensuring that each matter is handled with precision and purpose.
              </p>
              <p className="text-white/80 leading-relaxed text-lg font-500 text-left text-pretty">
                Through secure party access,modern legal systems,and tailored strategy,we provide a level of representation designed for complex,high-impact matters where clarity,discretion and results are essential.
              </p>
            </div>

            <div className="grid gap-6 pt-4">
              <div className="flex items-center gap-6 p-6 bg-white/5 border border-white/10 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 rounded-xl bg-primary-500/10 text-primary-400 flex items-center justify-center">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                </div>
                <div>
                  <p className="font-900 text-white text-[15px] uppercase tracking-wider">Personalized Approach</p>
                  <p className="text-[10px] text-white/80 uppercase tracking-widest font-900 mt-1">We tailor every strategy to your position, your priorities, and the results you intend to achieve.</p>
                </div>
              </div>
              <div className="flex items-center gap-6 p-6 bg-white/5 border border-white/10 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                </div>
                <div>
                  <p className="font-900 text-white text-[15px] tracking-tight uppercase tracking-wider">Confidential Handling</p>
                  <p className="text-[10px] text-white/80 uppercase tracking-widest font-900 mt-1">Encrypted matter security</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. PRACTICE AREAS SECTION */}
      <section id="practice-areas" className="scroll-mt-32 reveal-on-scroll">
        <div className="text-center mb-10">
          <h2 className="text-4xl lg:text-5xl font-display font-900 text-white mb-6 tracking-tight">Practice Areas</h2>
          <div className="w-12 h-1 bg-primary-500 rounded-full mx-auto mb-8" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8 mt-12">
          {practiceAreas.map(area => (
            <div key={area.title} className="p-8 bg-white/5 border border-white/5 rounded-[2.5rem] shadow-sm hover:shadow-2xl hover:border-primary-500/30 transition-all duration-300 group flex flex-col items-center h-full text-center relative overflow-hidden active:scale-[0.98] hover:-translate-y-1">
              <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-bl-[2rem] -z-10 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="w-14 h-14 bg-white/5 rounded-xl flex items-center justify-center text-primary-400 mb-6 group-hover:bg-primary-500/20 transition-colors shadow-inner">
                {area.icon}
              </div>
              <h3 className="text-[17px] font-display font-900 text-white mb-4 tracking-tight leading-tight">{area.title}</h3>
              {area.desc && (
                <p className="text-white/80 leading-relaxed text-[13px] font-500 text-pretty">
                  {area.desc}
                </p>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white/5 py-12 sm:py-14 lg:py-20 rounded-3xl border border-white/5 shadow-inner px-4 sm:px-8 lg:px-16 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/10 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/2" />
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl lg:text-5xl font-display font-900 text-white mb-8 tracking-tight">Our Commitment to Parties</h2>
          <p className="text-white/80 text-lg lg:text-xl leading-relaxed font-500 text-pretty max-w-3xl mx-auto">
            Grounded in legal expertise and executed with modern precision,we provide direct communication,secure access and focused legal strategy.
          </p>
        </div>
      </section>

      {/* 4. PARTY PORTAL SECTION */}
      <section className="relative overflow-hidden rounded-3xl bg-white/5 text-white p-6 sm:p-10 lg:p-16 shadow-2xl border border-white/5 reveal-on-scroll">
        <div className="absolute top-0 right-0 p-12 opacity-5">
          <svg className="w-96 h-96" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14.5v-9l6 4.5-6 4.5z" /></svg>
        </div>
        <div className="relative z-10 grid lg:grid-cols-2 gap-8 sm:gap-12 lg:gap-16 items-center text-left">
          <div>
            <h2 className="text-4xl lg:text-7xl font-display font-900 mb-10 leading-tight tracking-tight">Focused Representation at <span className="text-primary-400">Every Stage</span></h2>
            <p className="text-white/80 text-lg lg:text-xl mb-16 leading-relaxed font-500 text-pretty">
              We take a disciplined,hands-on approach,maintaining control of the process,protecting your interests,and driving the matter toward resolution.
            </p>
            <div className="grid sm:grid-cols-2 gap-6 sm:gap-10">
              {[
                { title: 'Case Strategy & Planning', desc: '' },
                { title: 'Document Preparation', desc: '' },
                { title: 'Ongoing Legal Support', desc: '' },
                { title: 'Attorney Communication', desc: '' }
              ].map(item => (
                <div key={item.title} className="flex gap-5 group">
                  <div className="w-10 h-10 bg-primary-600/20 text-primary-400 rounded-full flex items-center justify-center font-bold text-[16px] ring-1 ring-primary-500/50 flex-shrink-0 group-hover:bg-primary-600 group-hover:text-white transition-all duration-300">✓</div>
                  <div>
                    <h4 className="text-[18px] font-900 text-white mb-2 tracking-tight">{item.title}</h4>
                    <p className="text-[14px] text-white/70 font-500 leading-snug">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="hidden lg:block relative">
            <div className="absolute inset-0 bg-primary-600 blur-[140px] opacity-20" />
            <div className="relative bg-white/5 backdrop-blur-md rounded-3xl border border-white/10 p-16 shadow-inner">
              <div className="space-y-12">
                <div className="flex items-center gap-8">
                  <div className="w-20 h-20 rounded-3xl bg-primary-600 flex items-center justify-center shadow-2xl shadow-primary-600/20">
                    <div className="w-8 h-8 rounded-full bg-white/20" />
                  </div>
                  <div>
                    <h4 className="text-2xl font-900 tracking-tight">Professional Advocacy</h4>
                    <p className="text-primary-400 text-xs font-900 uppercase tracking-[0.3em] mt-2">Active Representation</p>
                  </div>
                </div>
                <div className="space-y-10">
                  <div className="p-8 bg-white/5 rounded-2xl border border-white/5 shadow-inner">
                    <p className="text-white/80 text-[15px] mb-4 leading-relaxed text-pretty">"Exceptional communication and clear strategic vision for my legal matter."</p>
                    <p className="text-white text-[11px] font-900 uppercase tracking-[0.3em] text-right opacity-60">— Recent Party Review</p>
                  </div>
                  <Link to="/login" className="flex items-center justify-center w-full py-6 bg-white/5 border border-white/10 text-white rounded-[1.5rem] font-900 uppercase tracking-widest text-sm hover:bg-white/10 hover:-translate-y-1 transition-all duration-300 shadow-xl shadow-black/20">
                    Enter Secure Party Portal
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. CONTACT US SECTION (Combined from ContactPage) */}
      <section id="contact-us" className="scroll-mt-28 sm:scroll-mt-32 space-y-10 sm:space-y-16 lg:space-y-20 reveal-on-scroll">
        <div className="text-center">
          <span className="text-primary-500 font-900 text-[11px] uppercase tracking-[0.3em] mb-4 block leading-none">Get in Touch</span>
          <h2 className="text-4xl lg:text-5xl font-display font-900 text-white mb-6 tracking-tight text-balance">Contact Our Firm</h2>
          <div className="w-12 h-1 bg-primary-500 rounded-full mx-auto mb-8" />
          <p className="text-white/80 text-lg lg:text-xl max-w-2xl mx-auto font-500 leading-relaxed text-center text-pretty">Connect with our office for expert legal guidance and professional matter advocacy.</p>
        </div>

        <div className="grid lg:grid-cols-12 gap-6 sm:gap-10 text-left items-stretch">
          <div className="lg:col-span-5 flex flex-col gap-8">
            <div className="relative group reveal-left w-full">
              <div className="absolute -inset-4 bg-primary-600/5 rounded-3xl rotate-1 -z-10 group-hover:rotate-0 transition-transform duration-1000" />
              <div className="relative overflow-hidden rounded-3xl border border-white/10 shadow-2xl bg-[#1a2233]">
                <img
                  src={heroSide}
                  alt="Victoria Tulsidas - Advocacy"
                  className="w-full h-full object-cover aspect-[16/10] sm:aspect-[16/9] lg:aspect-[4/3] group-hover:scale-105 transition-transform duration-1000"
                />
              </div>
            </div>

            <div className="p-8 bg-white/5 border border-white/10 rounded-[3rem] text-white shadow-2xl relative overflow-hidden group flex-1 flex flex-col">
              {/* Our Office Section */}
              <div className="relative overflow-hidden rounded-2xl mb-8 border border-white/10 shadow-inner">
                <img src={officeImg} alt="Our Office Interior" className="w-full aspect-video object-cover group-hover:scale-105 transition-transform duration-1000" />
              </div>
              <div className="absolute -top-12 -right-12 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl group-hover:scale-150 transition-all duration-1000" />

              <h3 className="text-[18px] font-800 mb-6 flex items-center gap-3 tracking-tight relative z-10">
                <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse shadow-lg shadow-emerald-500/50" /> Our Office
              </h3>

              <div className="space-y-6 mb-10 relative z-10">
                <div className="flex flex-col gap-1 pb-4 border-b border-white/5">
                  <span className="text-[10px] uppercase font-900 tracking-widest text-primary-400">Main Office</span>
                  <span className="text-white font-700">750 San Vincente Blvd, Suite 800<br />West Hollywood, CA 90069</span>
                </div>
              </div>

              {/* Contact Us Section */}
              <div className="mt-auto">
                <h3 className="text-[18px] font-800 mb-6 tracking-tight relative z-10">Contact Us</h3>
                <div className="space-y-4 relative z-10">
                  {[
                    { label: 'Direct Line', value: '(310) 504-2359', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>, link: 'tel:+13105042359' },
                    { label: 'Electronic Inquiry', value: 'info@victoriatulsidaslaw.com', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>, link: 'mailto:info@victoriatulsidaslaw.com' },
                    { label: 'Digital Access', value: 'www.VictoriaTulsidasLaw.com', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9-9H3m9 9V3m0 9l-9 9" /></svg>, link: '#' }
                  ].map(item => (
                    <a key={item.label} href={item.link} className="flex gap-5 p-5 bg-white/5 border border-white/5 rounded-2xl hover:border-primary-500/30 transition-all group items-center">
                      <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/70 group-hover:text-primary-400 transition-colors">
                        {item.icon}
                      </div>
                      <div className="flex flex-col">
                        <p className="text-[10px] font-900 text-primary-400 uppercase tracking-[0.2em] leading-none mb-1.5">{item.label}</p>
                        <p className="text-[15px] font-800 text-white tracking-tight">{item.value}</p>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* C. CONTACT FORM */}
          <div className="lg:col-span-7 flex flex-col">
            <div className="bg-white/5 border border-white/5 p-5 sm:p-10 lg:p-16 rounded-[3rem] shadow-2xl relative overflow-hidden flex-1 flex flex-col justify-center">
              <div className="absolute top-0 left-0 w-full h-1 bg-primary-600" />
              <div className="mb-12">
                <h3 className="text-2xl lg:text-3xl font-display font-800 text-white mb-4 tracking-tight">Request for Representation:</h3>
                <p className="text-white/80 font-500 text-[15px] leading-relaxed text-left text-pretty">
                  Submit the details of your matter for review.Our office will evaluate and respond where appropriate.All submissions are handled with discretion.
                </p>
              </div>
              <ContactForm />
            </div>
          </div>
        </div>
      </section>

      {/* 6. BOOK CONSULTATION SECTION (Combined from BookConsultationPage) */}
      <section id="book-consultation" className="scroll-mt-28 sm:scroll-mt-32 space-y-10 sm:space-y-16 lg:space-y-20">
        <div className="text-center">
          <span className="text-primary-500 font-900 text-[11px] uppercase tracking-[0.3em] mb-4 block leading-none">Schedule Evaluation</span>
          <h2 className="text-4xl lg:text-5xl font-display font-900 text-white mb-6 tracking-tight">Request a Consultation</h2>
          <div className="w-12 h-1 bg-primary-500 rounded-full mx-auto mb-8" />
          <p className="text-white/80 text-lg lg:text-xl max-w-2xl mx-auto font-500 leading-relaxed text-center text-pretty">Consultations are scheduled to assess your matter and determine an appropriate course of action.</p>
        </div>

        <div className="grid lg:grid-cols-12 gap-6 sm:gap-10 text-left items-start">
          {/* B. CONSULTATION FORM */}
          <div className="lg:col-span-8 order-2 lg:order-1">
            <div className="bg-white/5 border border-white/5 p-5 sm:p-10 lg:p-16 rounded-3xl shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-primary-600" />
              <div className="mb-12">
                <h3 className="text-2xl lg:text-3xl font-display font-800 text-white mb-2 tracking-tight">Strategy Session Request</h3>
                <p className="text-white/80 font-500 text-[15px] text-pretty">Please select your preferred time and provide initial matter details.</p>
              </div>
              <ConsultationForm />
            </div>
          </div>

          {/* C. SIDE PANEL INFO */}
          <div className="lg:col-span-4 space-y-10 order-1 lg:order-2">
            <div className="space-y-8">
              <h3 className="text-2xl font-display font-800 text-white tracking-tight leading-none">The Strategy Process</h3>
              <div className="space-y-4">
                {[
                  { title: '01-Submit', desc: 'Provide the details of your matter through our secure intake.' },
                  { title: '02-Review', desc: 'We conduct a conflict check and evaluate the matter.' },
                  { title: '03-Consult', desc: 'A focused strategy session to determine your position and path forward.' }
                ].map(item => (
                  <div key={item.title} className="flex gap-5 p-6 bg-white/5 border border-white/5 rounded-[2rem] shadow-sm hover:border-primary-500/30 transition-all group">
                    <div className="flex-1">
                      <p className="font-800 text-white text-[16px] tracking-tight mb-1">{item.title}</p>
                      <p className="text-[13px] text-white/70 leading-relaxed font-500 text-pretty">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>


          </div>
        </div>
      </section>

    </div>
  );
}

export function ContactForm() {
  const ctx = useOutletContext();
  const toast = ctx?.toast || ((msg) => alert(msg));
  const [loading, setLoading] = useState(false);
  const [hasCourtDate, setHasCourtDate] = useState('No');
  const [isOngoing, setIsOngoing] = useState(false);
  const [photoFile, setPhotoFile] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const email = String(fd.get('email') || '').trim();
    const phone = String(fd.get('phone') || '').trim();
    const preferred_contact_method = fd.get('preferred_contact_method') || 'email';

    // 1. Phone OR Email validation rule
    if (!email && !phone) {
      toast('Please enter at least an Email Address or a Phone Number so we can reach you.', 'error');
      return;
    }

    // 2. Preferred contact method validation check
    if (preferred_contact_method === 'email' && !email) {
      toast('Please enter your Email Address since your preferred contact method is Email.', 'error');
      return;
    }
    if ((preferred_contact_method === 'call' || preferred_contact_method === 'text') && !phone) {
      toast('Please enter your Phone Number since your preferred contact method is Call/Text.', 'error');
      return;
    }

    setLoading(true);
    try {
      let photo_base64 = '';
      let photo_name = '';
      if (photoFile) {
        photo_name = photoFile.name;
        photo_base64 = await new Promise((resolve) => {
          const r = new FileReader();
          r.onload = () => resolve(r.result);
          r.readAsDataURL(photoFile);
        });
      }

      const payload = {
        full_name: fd.get('full_name'),
        email,
        phone,
        preferred_contact_method,
        preferred_language: fd.get('preferred_language') || 'English',
        city: fd.get('city') || '',
        zip_code: fd.get('zip_code') || '',
        matter_type: fd.get('matter_type') || 'Something else / not sure',
        incident_date: fd.get('incident_date') || '',
        is_ongoing: isOngoing,
        incident_location: fd.get('incident_location') || '',
        message: fd.get('message'),
        parties_involved: fd.get('parties_involved') || '',
        has_court_date: hasCourtDate,
        court_date: fd.get('court_date') || '',
        court_date_description: fd.get('court_date_description') || '',
        has_court_papers: fd.get('has_court_papers') || 'No',
        currently_represented: fd.get('currently_represented') || 'No',
        referral_source: fd.get('referral_source') || 'Website',
        disclaimer_accepted: fd.get('disclaimer_accepted') === 'on',
        // CCPA Notice version tracking details
        privacy_notice_version: 'v1.0-2026-CCPA',
        privacy_notice_accepted_at: new Date().toISOString(),
        photo_base64,
        photo_name,
      };

      await api.leads.publicInquiry(payload);
      toast('Your intake inquiry has been submitted successfully! Our team will review it shortly.', 'success');
      form.reset();
      setHasCourtDate('No');
      setIsOngoing(false);
      setPhotoFile(null);
    } catch (err) {
      toast(err.message || 'Could not submit your inquiry. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="space-y-5 sm:space-y-6" onSubmit={handleSubmit}>
      {/* Name & Preferred Language */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2.5">
          <label className="block text-[13px] font-800 text-white/80 uppercase tracking-widest ml-1">Full Name <span className="text-primary-500">*</span></label>
          <input name="full_name" required className="w-full bg-white/5 border-2 border-white/5 rounded-[1.5rem] px-6 py-4 text-[15px] outline-none focus:border-primary-500/50 transition-all font-600 text-white placeholder:text-white/40" placeholder="e.g. Jane Doe" />
        </div>
        <div className="space-y-2.5">
          <label className="block text-[13px] font-800 text-white/80 uppercase tracking-widest ml-1">Preferred Language</label>
          <select name="preferred_language" className="w-full bg-[#1a2233] border-2 border-white/5 rounded-[1.5rem] px-6 py-4 text-[15px] outline-none focus:border-primary-500/50 transition-all font-600 text-white cursor-pointer">
            <option value="English">English</option>
            <option value="Spanish">Spanish (Español)</option>
            <option value="Armenian">Armenian (Հայերեն)</option>
            <option value="Vietnamese">Vietnamese (Tiếng Việt)</option>
            <option value="Chinese">Chinese (中文)</option>
            <option value="Tagalog">Tagalog</option>
            <option value="Farsi">Farsi (فارسی)</option>
            <option value="Other">Other</option>
          </select>
        </div>
      </div>

      {/* Email & Phone & Preferred Contact */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="space-y-2.5">
          <label className="block text-[13px] font-800 text-white/80 uppercase tracking-widest ml-1">Email Address</label>
          <input name="email" type="email" className="w-full bg-white/5 border-2 border-white/5 rounded-[1.5rem] px-6 py-4 text-[15px] outline-none focus:border-primary-500/50 transition-all font-600 text-white placeholder:text-white/40" placeholder="name@domain.com" />
        </div>
        <div className="space-y-2.5">
          <label className="block text-[13px] font-800 text-white/80 uppercase tracking-widest ml-1">Phone Number</label>
          <input name="phone" onChange={e => e.target.value = formatUSPhone(e.target.value)} className="w-full bg-white/5 border-2 border-white/5 rounded-[1.5rem] px-6 py-4 text-[15px] outline-none focus:border-primary-500/50 transition-all font-600 text-white placeholder:text-white/40" placeholder="(310) 504-2359" />
        </div>
        <div className="space-y-2.5">
          <label className="block text-[13px] font-800 text-white/80 uppercase tracking-widest ml-1">Preferred Contact <span className="text-primary-500">*</span></label>
          <select name="preferred_contact_method" className="w-full bg-[#1a2233] border-2 border-white/5 rounded-[1.5rem] px-6 py-4 text-[15px] outline-none focus:border-primary-500/50 transition-all font-600 text-white cursor-pointer">
            <option value="call">Phone Call</option>
            <option value="text">Text Message (SMS)</option>
            <option value="email">Email</option>
          </select>
        </div>
      </div>

      {/* City & ZIP */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2.5">
          <label className="block text-[13px] font-800 text-white/80 uppercase tracking-widest ml-1">City</label>
          <input name="city" className="w-full bg-white/5 border-2 border-white/5 rounded-[1.5rem] px-6 py-4 text-[15px] outline-none focus:border-primary-500/50 transition-all font-600 text-white placeholder:text-white/40" placeholder="e.g. Los Angeles" />
        </div>
        <div className="space-y-2.5">
          <label className="block text-[13px] font-800 text-white/80 uppercase tracking-widest ml-1">ZIP Code</label>
          <input name="zip_code" className="w-full bg-white/5 border-2 border-white/5 rounded-[1.5rem] px-6 py-4 text-[15px] outline-none focus:border-primary-500/50 transition-all font-600 text-white placeholder:text-white/40" placeholder="e.g. 90210" />
        </div>
      </div>

      {/* Issue Type Dropdown (Universal practice areas per Addendum A Section 2) */}
      <div className="space-y-2.5">
        <label className="block text-[13px] font-800 text-white/80 uppercase tracking-widest ml-1">What kind of issue is this? <span className="text-primary-500">*</span></label>
        <select name="matter_type" required className="w-full bg-[#1a2233] border-2 border-white/5 rounded-[1.5rem] px-6 py-4 text-[15px] outline-none focus:border-primary-500/50 transition-all font-600 text-white cursor-pointer">
          <option value="Car accident / injury">Car accident / vehicle injury</option>
          <option value="Injury from a product or device">Injury from a product or medical device</option>
          <option value="Housing conditions / landlord issue">Housing conditions / landlord issue</option>
          <option value="Work issue (termination, retaliation, discrimination)">Work issue (termination, retaliation, discrimination)</option>
          <option value="Civil rights / discrimination">Civil rights / discrimination</option>
          <option value="Immigration">Immigration / Visa / Global filing</option>
          <option value="Something else / not sure">Something else / Not sure</option>
        </select>
      </div>

      {/* Incident Dates & Location */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="block text-[13px] font-800 text-white/80 uppercase tracking-widest ml-1">When did this happen?</label>
            <label className="flex items-center gap-2 text-xs text-white/70 cursor-pointer">
              <input type="checkbox" checked={isOngoing} onChange={e => setIsOngoing(e.target.checked)} className="rounded bg-white/10 border-white/20 text-primary-600" />
              <span>Ongoing issue</span>
            </label>
          </div>
          <input name="incident_date" type="date" disabled={isOngoing} className="w-full bg-white/5 border-2 border-white/5 rounded-[1.5rem] px-6 py-4 text-[15px] outline-none focus:border-primary-500/50 transition-all font-600 text-white disabled:opacity-40" />
        </div>
        <div className="space-y-2.5">
          <label className="block text-[13px] font-800 text-white/80 uppercase tracking-widest ml-1">Where did this happen?</label>
          <input name="incident_location" className="w-full bg-white/5 border-2 border-white/5 rounded-[1.5rem] px-6 py-4 text-[15px] outline-none focus:border-primary-500/50 transition-all font-600 text-white placeholder:text-white/40" placeholder="City, State or Location" />
        </div>
      </div>

      {/* What happened narrative */}
      <div className="space-y-2.5">
        <label className="block text-[13px] font-800 text-white/80 uppercase tracking-widest ml-1">What happened, in your own words? <span className="text-primary-500">*</span></label>
        <textarea name="message" required className="w-full bg-white/5 border-2 border-white/5 rounded-[2rem] p-6 text-[15px] outline-none focus:border-primary-500/50 transition-all min-h-[140px] resize-none font-600 text-white placeholder:text-white/40" placeholder="Please describe what happened, including key details and what help you need." />
      </div>

      {/* Attach Photo or Documents */}
      <div className="space-y-2.5">
        <label className="block text-[13px] font-800 text-white/80 uppercase tracking-widest ml-1">Attach Photos or Documents (Optional)</label>
        <input
          type="file"
          accept="image/*,application/pdf,.doc,.docx"
          onChange={e => setPhotoFile(e.target.files?.[0] || null)}
          className="w-full bg-white/5 border-2 border-white/5 rounded-[1.5rem] p-4 text-[14px] outline-none focus:border-primary-500/50 transition-all font-600 text-white"
        />
        <p className="text-[11px] text-white/50 ml-1">Attach incident photos, police reports, or relevant documents directly from your phone camera or gallery.</p>
      </div>

      {/* Court Date / Hearing Disclosed */}
      <div className="space-y-4 p-5 rounded-2xl bg-white/5 border border-white/10">
        <label className="block text-[13px] font-800 text-white/80 uppercase tracking-widest ml-1">Do you have a deadline, court date, or hearing you know of? <span className="text-primary-500">*</span></label>
        <div className="flex gap-6">
          <label className="flex items-center gap-2 text-xs text-white/70 cursor-pointer">
            <input type="radio" name="has_court_date_radio" checked={hasCourtDate === 'Yes'} onChange={() => setHasCourtDate('Yes')} className="rounded bg-white/10 border-white/20 text-primary-600" />
            <span>Yes</span>
          </label>
          <label className="flex items-center gap-2 text-xs text-white/70 cursor-pointer">
            <input type="radio" name="has_court_date_radio" checked={hasCourtDate === 'No'} onChange={() => setHasCourtDate('No')} className="rounded bg-white/10 border-white/20 text-primary-600" />
            <span>No</span>
          </label>
        </div>
        {hasCourtDate === 'Yes' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 animate-fade-in">
            <div className="space-y-2.5">
              <label className="block text-[12px] font-800 text-white/70 uppercase tracking-wider ml-1">Deadline or Court Date</label>
              <input name="court_date" type="date" required className="w-full bg-white/5 border-2 border-white/5 rounded-[1.5rem] px-6 py-4 text-[15px] outline-none focus:border-primary-500/50 transition-all font-600 text-white" />
            </div>
            <div className="space-y-2.5">
              <label className="block text-[12px] font-800 text-white/70 uppercase tracking-wider ml-1">What is this deadline for?</label>
              <input name="court_date_description" required className="w-full bg-white/5 border-2 border-white/5 rounded-[1.5rem] px-6 py-4 text-[15px] outline-none focus:border-primary-500/50 transition-all font-600 text-white placeholder:text-white/40" placeholder="e.g. Trial, Filing Deadline, Hearing" />
            </div>
          </div>
        )}
      </div>

      {/* How did you hear about us */}
      <div className="space-y-2.5">
        <label className="block text-[13px] font-800 text-white/80 uppercase tracking-widest ml-1">How did you hear about us?</label>
        <select name="referral_source" className="w-full bg-[#1a2233] border-2 border-white/5 rounded-[1.5rem] px-6 py-4 text-[15px] outline-none focus:border-primary-500/50 transition-all font-600 text-white cursor-pointer">
          <option value="Google Search">Google Search</option>
          <option value="Client Referral">Friend / Client Referral</option>
          <option value="Social Media">Social Media</option>
          <option value="Billboard / Advertisement">Billboard / Advertisement</option>
          <option value="Attorney Referral">Attorney Referral</option>
          <option value="Other">Other</option>
        </select>
      </div>

      {/* Mandated Disclaimers */}
      <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-3">
        <label className="flex items-start gap-3 text-xs text-white/80 cursor-pointer">
          <input type="checkbox" name="disclaimer_accepted" required className="mt-0.5 rounded bg-white/10 border-white/20 text-primary-600" />
          <span>I understand that submitting this inquiry does not create an attorney-client relationship until a formal agreement is signed by both parties.</span>
        </label>
        <p className="text-[11px] text-white/50 leading-relaxed pl-6">
          All information submitted is held strictly confidential. By clicking submit, you consent to be contacted regarding your inquiry via phone, SMS, or email.
        </p>
      </div>

      {/* Submit button */}
      <div className="pt-2">
        <button disabled={loading} className={`w-full py-5 bg-primary-600 text-white font-900 rounded-[2rem] uppercase tracking-widest text-[15px] hover:bg-primary-700 transition-all duration-300 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}>
          {loading ? 'Submitting Inquiry...' : 'Submit Confidential Inquiry'}
        </button>
      </div>
    </form>
  );
}

export function PublicIntakePage() {
  return (
    <div className="min-h-screen bg-[#0b0f19] text-white py-10 px-4 sm:px-6 flex justify-center items-center">
      <div className="w-full max-w-2xl bg-[#141b2d] border border-white/10 rounded-[2.5rem] p-6 sm:p-10 space-y-6 shadow-2xl my-auto">
        <div className="text-center space-y-2">
          <span className="text-[10px] font-900 bg-primary-600/20 text-primary-400 border border-primary-500/30 px-3 py-1 rounded-full uppercase tracking-widest">
            VICTORIA TULSIDAS LAW — PUBLIC INTAKE PORTAL
          </span>
          <h1 className="text-2xl sm:text-3xl font-900 font-display">5-Minute Phone Intake Form</h1>
          <p className="text-xs sm:text-sm text-slate-400">Complete this universal form to request immediate consultation. No attorney-client relationship is created until an agreement is signed.</p>
        </div>

        <ContactForm />
      </div>
    </div>
  );
}

export function ConsultationForm() {
  const { toast } = useOutletContext();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    setLoading(true);
    try {
      const fd = new FormData(form);
      await api.leads.publicConsultation({
        full_name: fd.get('full_name'),
        email: fd.get('email'),
        phone: fd.get('phone'),
        preferred_date: fd.get('preferred_date'),
        matter_type: fd.get('matter_type'),
        message: fd.get('message'),
      });
      toast('Consultation request transmitted. Our staff will contact you to confirm the time.', 'success');
      form.reset();
    } catch (err) {
      toast(err.message || 'Could not submit your request. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="space-y-5 sm:space-y-6" onSubmit={handleSubmit}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2.5">
          <label className="block text-[13px] font-800 text-white/80 uppercase tracking-widest ml-1">Full Name <span className="text-primary-500">*</span></label>
          <div className="relative group">
            <div className="absolute left-6 top-1/2 -translate-y-1/2 text-white/70 group-focus-within:text-primary-500 group-focus-within:scale-110 transition-all duration-300">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
            </div>
            <input name="full_name" required className="w-full bg-white/5 border-2 border-white/5 rounded-[1.5rem] sm:rounded-[2rem] pl-14 sm:pl-16 pr-6 sm:pr-8 py-4 sm:py-5 text-[15px] sm:text-[17px] outline-none focus:border-primary-500/50 focus:ring-8 focus:ring-primary-500/5 transition-all duration-300 font-600 text-white placeholder:text-white/60 shadow-sm hover:border-white/10 focus:shadow-xl focus:shadow-primary-500/10" placeholder="e.g., Alexander Hamilton" />
          </div>
        </div>
        <div className="space-y-2.5">
          <label className="block text-[13px] font-800 text-white/80 uppercase tracking-widest ml-1">Email Address <span className="text-primary-500">*</span></label>
          <div className="relative group">
            <div className="absolute left-6 top-1/2 -translate-y-1/2 text-white/70 group-focus-within:text-primary-500 group-focus-within:scale-110 transition-all duration-300">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
            </div>
            <input name="email" type="email" required className="w-full bg-white/5 border-2 border-white/5 rounded-[1.5rem] sm:rounded-[2rem] pl-14 sm:pl-16 pr-6 sm:pr-8 py-4 sm:py-5 text-[15px] sm:text-[17px] outline-none focus:border-primary-500/50 focus:ring-8 focus:ring-primary-500/5 transition-all duration-300 font-600 text-white placeholder:text-white/60 shadow-sm hover:border-white/10 focus:shadow-xl focus:shadow-primary-500/10" placeholder="name@domain.com" />
          </div>
        </div>
      </div>

      <div className="space-y-2.5">
        <label className="block text-[13px] font-800 text-white/80 uppercase tracking-widest ml-1">Phone Number</label>
        <div className="relative group">
          <div className="absolute left-6 top-1/2 -translate-y-1/2 text-white/70 group-focus-within:text-primary-500 group-focus-within:scale-110 transition-all duration-300">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
          </div>
          <input name="phone" type="tel" onChange={e => e.target.value = formatUSPhone(e.target.value)} className="w-full bg-white/5 border-2 border-white/5 rounded-[2rem] pl-16 pr-8 py-5 text-[17px] outline-none focus:border-primary-500/50 focus:ring-8 focus:ring-primary-500/5 transition-all duration-300 font-600 text-white placeholder:text-white/60 shadow-sm hover:border-white/10 focus:shadow-xl focus:shadow-primary-500/10" placeholder="(310) 504-2359" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2.5">
          <label className="block text-[13px] font-800 text-white/80 uppercase tracking-widest ml-1">Preferred Date <span className="text-primary-500">*</span></label>
          <div className="relative group">
            <div className="absolute left-6 top-1/2 -translate-y-1/2 text-white/70 group-focus-within:text-primary-500 group-focus-within:scale-110 transition-all duration-300 z-10 pointer-events-none">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            </div>
            <input name="preferred_date" type="date" required className="w-full bg-white/5 border-2 border-white/5 rounded-[2rem] pl-16 pr-8 py-5 text-[17px] outline-none focus:border-primary-500/50 focus:ring-8 focus:ring-primary-500/5 transition-all duration-300 font-600 text-white shadow-sm cursor-pointer hover:border-white/10 color-scheme-dark" style={{ colorScheme: 'dark' }} />
          </div>
        </div>
        <div className="space-y-2.5">
          <label className="block text-[13px] font-800 text-white/80 uppercase tracking-widest ml-1">Area of Representation<span className="text-primary-500">*</span></label>
          <div className="relative group">
            <div className="absolute left-6 top-1/2 -translate-y-1/2 text-white/70 group-focus-within:text-primary-500 group-focus-within:scale-110 transition-all duration-300 z-10 pointer-events-none">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" /></svg>
            </div>
            <select name="matter_type" required className="w-full bg-white/5 border-2 border-white/5 rounded-[2rem] pl-16 pr-12 py-5 text-[17px] outline-none focus:border-primary-500/50 focus:ring-8 focus:ring-primary-500/5 transition-all duration-300 appearance-none text-white font-600 cursor-pointer shadow-sm hover:border-white/10 focus:shadow-xl focus:shadow-primary-500/10">
              <option value="Personal Injury Advocacy" className="bg-[#1a2233]">Personal Injury Advocacy</option>
              <option value="International Law" className="bg-[#1a2233]">International Law</option>
              <option value="Immigration" className="bg-[#1a2233]">Immigration</option>
              <option value="Civil Litigation" className="bg-[#1a2233]">Civil Litigation</option>
              <option value="Creative Law" className="bg-[#1a2233]">Creative Law</option>
              <option value="Business Law" className="bg-[#1a2233]">Business Law</option>
            </select>
            <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-white/70 group-focus-within:text-primary-500 transition-all">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-2.5">
        <label className="block text-[13px] font-800 text-white/80 uppercase tracking-widest ml-1">Matter Summary <span className="text-primary-500">*</span></label>
        <div className="relative group">
          <div className="absolute left-6 top-7 text-white/70 group-focus-within:text-primary-500 group-focus-within:scale-110 transition-all duration-300">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
          </div>
          <textarea name="message" required className="w-full bg-white/5 border-2 border-white/5 rounded-[2.5rem] pl-16 pr-8 py-6 text-[17px] outline-none focus:border-primary-500/50 focus:ring-8 focus:ring-primary-500/5 transition-all duration-300 min-h-[160px] resize-none font-600 text-white placeholder:text-white/60 shadow-sm hover:border-white/10 focus:shadow-xl focus:shadow-primary-500/10" placeholder="Provide a brief overview of your matter, including key dates, parties involved, and current status." />
        </div>
      </div>

      <div className="pt-4">
        <button disabled={loading} className={`w-full py-5 lg:py-6 bg-primary-600 text-white font-900 rounded-[2.5rem] uppercase tracking-widest text-[15px] hover:bg-primary-700 hover:-translate-y-1 hover:shadow-2xl hover:shadow-primary-600/40 transition-all duration-300 active:scale-[0.98] ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}>
          {loading ? 'Verifying Calendar...' : 'Request Consultation Now'}
        </button>
        <p className="text-center text-[12px] text-white/80 mt-8 font-700 uppercase tracking-[0.2em]">
          Confidential Registry Transmission • <span className="text-primary-600">Secure Bridge</span>
        </p>
      </div>
    </form>
  );
}

export function ClientPortalLandingPage() {
  return (
    <div className="animate-fade-in space-y-16 sm:space-y-20 lg:space-y-24 overflow-x-clip">
      {/* 1. PAGE HEADER / HERO */}
      <section className="relative py-12 sm:py-14 lg:py-20 overflow-hidden bg-white/5 -mx-4 sm:-mx-6 px-4 sm:px-6 rounded-b-3xl shadow-inner border-b border-white/5">
        <div className="absolute top-0 right-0 p-24 opacity-[0.03] pointer-events-none">
          <svg className="w-[30rem] h-[30rem]" fill="currentColor" viewBox="0 0 24 24"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.5h7c-.47 4.18-3.05 7.85-7 9.12V11.5H5V6.3l7-3.11v8.31z" /></svg>
        </div>
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <span className="text-primary-500 font-900 text-[11px] uppercase tracking-[0.4em] mb-6 block leading-none">Member Connectivity Hub</span>
          <h1 className="text-4xl lg:text-7xl font-display font-900 text-white mb-10 leading-tight tracking-tight">Party Portal Access</h1>
          <p className="text-white/80 text-lg lg:text-xl max-w-2xl mx-auto mb-16 leading-relaxed font-500 text-pretty">
            We utilize a secure party portal to provide a centralized hub for matter management,document transmittal and persistent communication.
          </p>
          <div className="flex justify-center flex-wrap gap-6 lg:gap-8">
            <Link to="/login" className="btn btn-primary px-12 py-6 text-base font-900 uppercase tracking-widest shadow-2xl shadow-primary-500/40 hover:-translate-y-1 transition-all duration-300 rounded-[1.5rem]">Access Portal</Link>
            <a href="#contact-us" className="btn btn-secondary px-12 py-6 text-base font-900 uppercase tracking-widest bg-white/5 shadow-sm border border-white/10 hover:bg-white/10 hover:-translate-y-1 transition-all duration-300 rounded-[1.5rem]">Need Access?</a>
          </div>
        </div>
      </section>






      {/* Floating Action Button */}
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        className="fixed bottom-8 right-8 w-14 h-14 bg-primary-600 text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-50 group border-4 border-white/20"
      >
        <svg className="w-6 h-6 group-hover:-translate-y-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" /></svg>
      </button>

      <style dangerouslySetInnerHTML={{
        __html: `
        .reveal-on-scroll, .reveal-left, .reveal-right {
          opacity: 0;
          transition: all 1s cubic-bezier(0.2, 0.8, 0.2, 1);
        }
        .reveal-on-scroll { transform: translateY(40px); }
        .reveal-left { transform: translateX(-50px); }
        .reveal-right { transform: translateX(50px); }
        
        .reveal-visible {
          opacity: 1;
          transform: translate(0, 0);
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        .animate-float { animation: float 5s ease-in-out infinite; }
      `}} />
    </div>
  );
}
