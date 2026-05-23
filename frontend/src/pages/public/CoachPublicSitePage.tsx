import { useEffect, useMemo, useState } from "react";
import { Link as RouterLink, useParams } from "react-router-dom";

import { hubAsset } from "../../components/hub/hubAssets";
import { useHubPage } from "../../components/hub/useHubPage";
import { fetchPublicCoachSite, type CoachPublicSiteRead } from "../../lib/coachSiteApi";
import { mediaSrc } from "../../lib/exerciseMediaApi";

function accentColor(site: CoachPublicSiteRead): string {
  const c = site.primary_color?.trim();
  if (c && /^#[0-9A-Fa-f]{6}$/.test(c)) return c;
  return "#374151";
}

export function CoachPublicSitePage() {
  const { slug = "" } = useParams();
  const [site, setSite] = useState<CoachPublicSiteRead | null>(null);
  const [error, setError] = useState(false);

  useHubPage("modern-business", {
    bodyClass: "lqd-pf-single lqd-pf-single-style-1 site-wide-layout hub-coach-site",
  });

  useEffect(() => {
    let cancelled = false;
    void fetchPublicCoachSite(slug)
      .then((data) => {
        if (!cancelled) {
          setSite(data);
          setError(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSite(null);
          setError(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const color = useMemo(() => (site ? accentColor(site) : "#374151"), [site]);
  const registerUrl = site ? `/client/register?invite=${encodeURIComponent(site.invite_code)}` : "/client/register";

  const bannerBg = hubAsset("images/demo/modern-business/banner.jpg");
  const dotsBg = hubAsset("images/demo/modern-business/bg-dots.png");
  const contactBg = hubAsset("images/demo/modern-business/bg-contact.jpg");
  const logoDark = hubAsset("images/demo/modern-business/logo-dark.svg");
  const logoLight = hubAsset("images/demo/modern-business/logo-light.svg");

  if (error) {
    return (
      <div id="wrap" className="min-h-100vh flex items-center justify-center p-40">
        <div className="text-center">
          <h1 className="text-32 font-bold mb-15">Site not found</h1>
          <p className="text-gray-600 mb-25">This coach page is not published or does not exist.</p>
          <RouterLink to="/" className="btn btn-solid bg-gray-800 text-white rounded-100 px-2em">
            Back to Gym Coach
          </RouterLink>
        </div>
      </div>
    );
  }

  if (!site) {
    return <div id="wrap" className="min-h-100vh bg-gray-900" />;
  }

  const { content: c } = site;
  const services = c.services.length ? c.services : [{ title: "Coaching", description: "Personal training and nutrition guidance." }];
  const heroImage = c.hero.hero_image_url ? mediaSrc(c.hero.hero_image_url) : bannerBg;
  const aboutImage = c.about.image_url ? mediaSrc(c.about.image_url) : hubAsset("images/demo/modern-business/about-2.jpg");
  const siteLogo = site.logo_url ? mediaSrc(site.logo_url) : logoDark;

  return (
    <div id="wrap">
      <header className="main-header main-header-overlay main-header-dynamiccolors" data-sticky-header="true">
        <section className="lqd-head-sec-wrap pos-rel pt-20 px-60 md:hidden">
          <div className="lqd-head-sec container-fluid flex items-stretch p-0">
            <div className="col lqd-head-col">
              <div className="header-module module-logo no-rotate navbar-brand-plain py-30">
                <a className="navbar-brand" href="#banner" rel="home">
                  <span className="navbar-brand-inner">
                    <img className="logo-default" src={siteLogo} alt={site.name} style={{ maxHeight: 40 }} />
                  </span>
                </a>
              </div>
            </div>
            <div className="col lqd-head-col">
              <div className="header-module module-primary-nav static flex-col">
                <div className="navbar-collapse lqd-submenu-default-style h-auto" role="navigation">
                  <ul className="main-nav lqd-menu-counter-right main-nav-hover-fade-inactive nav reset-ul flex items-stretch link-15 link-medium link-white-80" data-localscroll="true" data-localscroll-options='{"itemsSelector":"> li > a"}'>
                    <li><a href="#banner">Home</a></li>
                    <li><a href="#services">Services</a></li>
                    <li><a href="#about">About</a></li>
                    <li><a href="#contact">Contact</a></li>
                  </ul>
                </div>
              </div>
            </div>
            <div className="col lqd-head-col justify-end lg:hidden">
              <div className="header-module module-button flex-col items-end py-10">
                <RouterLink
                  to={registerUrl}
                  className="btn btn-solid btn-md btn-default uppercase btn-hover-txt-liquid-y btn-bordered border-thick btn-has-label border-2 rounded-100 text-12 uppercase font-bold tracking-0/1em leading-1/5em text-white el-btn"
                  style={{ borderColor: color, backgroundColor: color }}
                >
                  <span className="btn-txt">{c.hero.cta_label || "Become a client"}</span>
                </RouterLink>
              </div>
            </div>
          </div>
        </section>
        <section className="lqd-mobile-sec">
          <div className="lqd-mobile-sec-inner navbar-header flex items-stretch">
            <button type="button" className="navbar-toggle collapsed nav-trigger style-mobile flex relative items-center justify-end p-0" data-bs-toggle="collapse" data-bs-target="#lqd-mobile-sec-nav" aria-expanded="false">
              <span className="bars inline-block relative z-1">
                <span className="bars-inner flex flex-col w-full h-full">
                  <span className="bar inline-block" />
                  <span className="bar inline-block" />
                  <span className="bar inline-block" />
                </span>
              </span>
            </button>
            <a className="navbar-brand flex justify-start" href="#banner">
              <span className="navbar-brand-inner">
                <img className="logo-default" src={siteLogo} alt={site.name} style={{ maxHeight: 36 }} />
              </span>
            </a>
          </div>
          <div className="lqd-mobile-sec-nav">
            <div className="mobile-navbar-collapse navbar-collapse collapse w-full bg-white" id="lqd-mobile-sec-nav">
              <ul className="lqd-mobile-main-nav main-nav nav reset-ul text-black" data-localscroll="true">
                <li><a href="#banner">Home</a></li>
                <li><a href="#services">Services</a></li>
                <li><a href="#about">About</a></li>
                <li><a href="#contact">Contact</a></li>
              </ul>
            </div>
          </div>
        </section>
      </header>

      <main className="content overflow-hidden bg-white" id="lqd-site-content">
        <div id="lqd-contents-wrap">
          <section
            className="lqd-section banner min-h-100vh flex items-center bg-cover bg-center border-10 border-white"
            id="banner"
            style={{ backgroundImage: `url(${heroImage})` }}
          >
            <div className="container">
              <div className="row items-center">
                <div className="col col-12 col-xl-10 offset-xl-1 relative flex flex-col justify-center items-center text-center">
                  <div className="ld-empty-space w-full h-210 sm:hidden" />
                  <h1 className="ld-fh-element relative mb-0 text-74 text-white font-bold" style={{ lineHeight: 1.05 }}>
                    {c.hero.headline || site.name}
                  </h1>
                  {c.hero.subheadline || site.tagline ? (
                    <p className="ld-fh-element relative mt-25 mb-0 text-20 leading-1/6em text-white-80 max-w-700 mx-auto">
                      {c.hero.subheadline || site.tagline}
                    </p>
                  ) : null}
                  <div className="ld-empty-space w-full h-40" />
                  <RouterLink
                    to={registerUrl}
                    className="btn btn-solid btn-md uppercase rounded-100 text-13 font-semibold text-white px-2em"
                    style={{ backgroundColor: color }}
                  >
                    {c.hero.cta_label || "Become a client"}
                  </RouterLink>
                  <div className="ld-empty-space w-full h-110" />
                </div>
              </div>
            </div>
          </section>

          <section
            className="lqd-section services flex items-center justify-center bg-center bg-norepeat pt-90 pb-30"
            id="services"
            style={{ backgroundImage: `url(${dotsBg})` }}
          >
            <div className="container">
              <div className="row justify-center items-center">
                <div className="col col-12 col-lg-8 mb-60 text-center">
                  <h2 className="ld-fh-element relative mb-0/5em">Services</h2>
                  <p className="ld-fh-element relative mb-0/5em px-5percent md:px-0">
                    {site.tagline || "Training, nutrition, and accountability — tailored to you."}
                  </p>
                </div>
                <div className="w-full" />
                {services.map((service, i) => (
                  <div key={`${service.title}-${i}`} className="col col-12 col-md-6 col-lg-4">
                    <div className="iconbox text-align-default iconbox-circle iconbox-sm mb-2em">
                      <div className="iconbox-icon-wrap mr-30">
                        <span className="iconbox-icon-container w-55 h-55 rounded-full text-24 text-white" style={{ backgroundColor: color }}>
                          {String(i + 1).padStart(2, "0")}
                        </span>
                      </div>
                      <div className="contents">
                        <h3 className="mb-15 text-15 uppercase">{service.title}</h3>
                        <p>{service.description || "—"}</p>
                      </div>
                    </div>
                    <div className="w-full relative h-30" />
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="lqd-section about flex items-center justify-center py-70 bg-white bg-norepeat" id="about">
            <div className="container">
              <div className="row items-center">
                <div className="col col-12 col-lg-5 mb-40 lg:mb-0">
                  <figure className="inline-flex max-w-full relative vertical-top justify-center shadow-md rounded-12 overflow-hidden">
                    <img src={aboutImage} alt={c.about.title} className="w-full" />
                  </figure>
                </div>
                <div className="col col-12 col-lg-6 offset-lg-1">
                  <h6 className="ld-fh-element mb-1em text-12 uppercase tracking-0/1em font-bold text-gray-500">About</h6>
                  <h2 className="ld-fh-element mb-0/5em text-50">{c.about.title}</h2>
                  <p className="ld-fh-element mb-0 text-18 leading-1/6em text-gray-600 whitespace-pre-wrap">{c.about.body}</p>
                </div>
              </div>
            </div>
          </section>

          <section
            className="lqd-section contact min-h-100vh flex items-center justify-center bg-norepeat bg-center bg-cover border-20 border-white"
            id="contact"
            style={{ backgroundImage: `url(${contactBg})` }}
          >
            <div className="container">
              <div className="row items-center justify-center">
                <div className="col col-12 col-lg-8 text-center">
                  <h1 className="ld-fh-element mb-0 text-74 text-white">Get in touch</h1>
                  <div className="ld-empty-space w-full relative h-20" />
                  <div className="ld-fh-element relative mb-0/5em text-20 leading-1/6em text-white">
                    {c.contact.email ? <p className="mb-10">{c.contact.email}</p> : null}
                    {c.contact.phone ? <p className="mb-10">{c.contact.phone}</p> : null}
                    {c.contact.instagram ? <p className="mb-10">Instagram: {c.contact.instagram}</p> : null}
                    {c.contact.whatsapp ? <p className="mb-10">WhatsApp: {c.contact.whatsapp}</p> : null}
                  </div>
                  <div className="ld-empty-space w-full relative h-20" />
                  <RouterLink
                    to={registerUrl}
                    className="btn btn-solid btn-md uppercase btn-lg rounded-100 text-13 font-semibold bg-white text-black hover:text-white px-2em"
                    style={{ ["--hover-bg" as string]: color }}
                  >
                    {c.hero.cta_label || "Become a client"}
                  </RouterLink>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>

      <footer className="main-footer pt-40 pb-30 bg-gray-900 text-white-50">
        <section className="lqd-section">
          <div className="container">
            <div className="row items-center">
              <div className="col col-12 col-md-6 flex items-center gap-15">
                <img src={logoLight} alt="" style={{ height: 28, opacity: 0.7 }} />
                <p className="mb-0 text-14">{site.name}</p>
              </div>
              <div className="col col-12 col-md-6 text-end md:text-start mt-15 md:mt-0">
                <p className="mb-0 text-12 opacity-70">Powered by Gym Coach</p>
              </div>
            </div>
          </div>
        </section>
      </footer>
    </div>
  );
}
