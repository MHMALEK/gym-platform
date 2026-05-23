import { useTranslation } from "react-i18next";
import { Link as RouterLink } from "react-router-dom";

import { LanguageSwitcher } from "../../components/LanguageSwitcher";
import { hubAsset } from "../../components/hub/hubAssets";
import { useHubPage } from "../../components/hub/useHubPage";
import { getUserRole } from "../../lib/authApi";

const PILLAR_IDS = ["ai", "finance", "programs"] as const;

export function HubLandingPage() {
  useHubPage("saas", { bodyClass: "hub-saas-landing" });
  const { t } = useTranslation();
  const isCoachLoggedIn = getUserRole() === "coach";

  const logo = hubAsset("images/demo/saas/logo/logo.svg");
  const bgPattern = hubAsset("images/demo/saas/bg/bg-pattern.svg");
  const heroShape = hubAsset("images/demo/saas/banner/Mask-Group-3@2x.jpg");
  const overviewShot = hubAsset("images/demo/saas/overview/ss-1@2x.jpg");

  return (
    <div id="wrap">
      <header id="site-header" className="main-header" data-sticky-header="true">
        <div className="lqd-head-sec-wrap relative lqd-hide-onstuck pt-5 pb-45 pl-160 md:hidden" style={{ background: "linear-gradient(270deg, rgb(61, 155, 252) 0%, rgb(123, 64, 228) 25%, rgb(245, 58, 139) 50%, rgb(238, 112, 74) 75%, #ddd24c 100%)" }}>
          <div className="lqd-head-sec container flex items-stretch">
            <div className="col w-full flex justify-end text-end pr-5 pl-15">
              <p className="ld-fh-element mb-0 text-12 text-white">{t("landing.eyebrow")}</p>
            </div>
            <div className="col w-full flex text-start pr-15 pl-5 items-center gap-2">
              <LanguageSwitcher />
            </div>
          </div>
        </div>
        <div className="lqd-head-sec-wrap relative -mt-40 bg-white module-bottom md:hidden">
          <div className="lqd-head-sec container-fluid flex items-stretch p-0">
            <div className="col lqd-head-col">
              <div className="header-module module-logo no-rotate navbar-brand-plain py-25">
                <RouterLink className="navbar-brand text-18" to="/" rel="home">
                  <span className="navbar-brand-inner">
                    <img className="logo-default" src={logo} alt={t("app.title")} />
                  </span>
                </RouterLink>
              </div>
            </div>
            <div className="col lqd-head-col">
              <div className="header-module module-primary-nav static">
                <div className="navbar-collapse lqd-submenu-cover h-full" role="navigation">
                  <ul className="main-nav lqd-menu-counter-right main-nav-hover-underline-1 items-stretch justify-center reset-ul flex h-full" data-localscroll="true" data-localscroll-options='{"itemsSelector":"> li > a"}'>
                    <li><a className="text-gray-500 font-medium" href="#banner">{t("landing.navHome", { defaultValue: "Home" })}</a></li>
                    <li><a className="text-gray-500 font-medium" href="#features">{t("landing.navFeatures", { defaultValue: "Features" })}</a></li>
                    <li><a className="text-gray-500 font-medium" href="#client">{t("landing.navClient", { defaultValue: "Client app" })}</a></li>
                  </ul>
                </div>
              </div>
            </div>
            <div className="col lqd-head-col text-end justify-end lg:hidden">
              <div className="header-module module-button flex gap-2">
                {isCoachLoggedIn ? (
                  <RouterLink to="/desk" className="btn btn-solid btn-sm border-none bg-slate-100 rounded-100 text-14 leading-1/25em text-black">
                    <span className="btn-txt">{t("landing.navDashboard")}</span>
                  </RouterLink>
                ) : (
                  <>
                    <RouterLink to="/login" className="btn btn-default btn-sm rounded-100 text-14 text-black">
                      <span className="btn-txt">{t("login.signIn")}</span>
                    </RouterLink>
                    <RouterLink to="/register" className="btn btn-solid btn-sm border-none bg-primary rounded-100 text-14 text-white">
                      <span className="btn-txt">{t("landing.ctaSignUp")}</span>
                    </RouterLink>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="lqd-mobile-sec">
          <div className="lqd-mobile-sec-inner navbar-header flex items-stretch">
            <button type="button" className="navbar-toggle collapsed nav-trigger style-mobile flex relative items-center justify-end border-none bg-transparent p-0" data-bs-toggle="collapse" data-bs-target="#lqd-mobile-sec-nav" aria-expanded="false">
              <span className="bars inline-block relative z-1">
                <span className="bars-inner flex flex-col w-full h-full">
                  <span className="bar inline-block" />
                  <span className="bar inline-block" />
                  <span className="bar inline-block" />
                </span>
              </span>
            </button>
            <RouterLink className="navbar-brand flex justify-start" to="/">
              <span className="navbar-brand-inner">
                <img className="logo-default" src={logo} alt={t("app.title")} />
              </span>
            </RouterLink>
          </div>
          <div className="lqd-mobile-sec-nav w-full absolute z-10">
            <div className="mobile-navbar-collapse collapse navbar-collapse bg-white" id="lqd-mobile-sec-nav">
              <ul className="reset-ul lqd-mobile-main-nav main-nav text-black" data-localscroll="true">
                <li><a href="#banner">Home</a></li>
                <li><a href="#features">{t("landing.navFeatures", { defaultValue: "Features" })}</a></li>
                <li><a href="#client">{t("landing.navClient", { defaultValue: "Client app" })}</a></li>
                <li><RouterLink to="/login">{t("login.signIn")}</RouterLink></li>
              </ul>
            </div>
          </div>
        </div>
      </header>

      <main className="content bg-repeat bg-center" id="lqd-site-content" style={{ backgroundImage: `url(${bgPattern})` }}>
        <div id="lqd-contents-wrap">
          <section className="lqd-section banner flex items-center justify-center pt-35 pb-50" id="banner">
            <div className="lqd-imggrp-container w-full absolute pointer-events-none top-20percent left-0">
              <div className="lqd-imggrp-single relative">
                <figure>
                  <img width="43" height="279" src={heroShape} alt="" />
                </figure>
              </div>
            </div>
            <div className="container">
              <div className="row">
                <div className="col col-12 col-lg-10 col-xl-8 offset-lg-1 offset-xl-2 text-center">
                  <div className="module-title flex flex-wrap justify-center px-15percent">
                    <div className="ld-fancy-heading max-w-full">
                      <h1 className="ld-fh-element mb-0/35em lqd-highlight-underline lqd-split-lines Tracking-0 font-semibold leading-1em text-70">
                        {t("landing.heroTitle")}
                        <span className="gradient-word" style={{ backgroundImage: "linear-gradient(to right, #3D9BFC, #7B40E4, #F53A8B, #EE704A, #2DDD4F)" }}>
                          {t("landing.heroHighlight", { defaultValue: "coaching" })}
                        </span>
                      </h1>
                    </div>
                    <div className="ld-fancy-heading max-w-full">
                      <p className="ld-fh-element mb-0/5em text-18 leading-30 text-slate-700">{t("landing.heroSubtitle")}</p>
                    </div>
                    <div className="w-full h-20" />
                    <RouterLink to="/register" className="btn btn-solid btn-hover-txt-switch btn-hover-txt-switch-y border-none px-1em mx-10 mb-10 bg-primary rounded-100 text-17 leading-1/5em text-white hover:bg-black">
                      <span className="inline-flex py-1/15em px-2/1em items-center">
                        <span className="btn-txt">{t("landing.ctaCoach")}</span>
                        <span className="btn-icon"><i className="lqd-icn-ess icon-md-arrow-forward" /></span>
                      </span>
                    </RouterLink>
                    <RouterLink to="/client/login" className="btn btn-default btn-hover-txt-switch btn-hover-txt-switch-y border-thick px-0/5em mx-10 mb-10 border-2 border-black-10 rounded-100 text-17 text-black leading-1/5em hover:bg-black hover:text-white">
                      <span className="inline-flex py-1/15em px-2/1em items-center">
                        <span className="btn-txt">{t("landing.ctaClient")}</span>
                      </span>
                    </RouterLink>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="lqd-section overview pb-60" id="overview">
            <div className="container">
              <div className="row justify-center mb-40">
                <div className="col col-12 col-lg-8 text-center">
                  <h2 className="ld-fh-element text-42 mb-0/5em">{t("landing.pillarsTitle")}</h2>
                  <p className="ld-fh-element text-18 text-gray-500">{t("landing.pillarsSubtitle")}</p>
                </div>
              </div>
              <figure className="inline-flex max-w-full relative flex-grow-1 vertical-top justify-center w-full">
                <img className="w-full rounded-12 shadow-lg" src={overviewShot} alt={t("landing.pillarsEyebrow")} />
              </figure>
            </div>
          </section>

          <section className="lqd-section text-image-box pt-60 pb-30" id="features">
            <div className="container">
              {PILLAR_IDS.map((id, index) => {
                const reversed = index % 2 === 1;
                return (
                  <div key={id} className={`row items-center mb-80 ${reversed ? "flex-row-reverse" : ""}`}>
                    <div className="col col-12 col-lg-5 self-center">
                      <div className="module-content w-full relative flex flex-col flex-grow-1 justify-center">
                        <h6 className="ld-fh-element mb-2em text-primary uppercase tracking-0/1em text-12 font-bold">{t("landing.pillarsEyebrow")}</h6>
                        <h2 className="ld-fh-element mb-0/35em text-50">{t(`landing.pillars.${id}.title`)}</h2>
                        <p className="ld-fh-element mb-0/5em text-17 leading-1/5em">{t(`landing.pillars.${id}.desc`)}</p>
                        <ul className="reset-ul mt-20 text-16 leading-1/6em text-gray-600">
                          {[1, 2, 3].map((n) => (
                            <li key={n} className="mb-10">• {t(`landing.pillars.${id}.b${n}`)}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                    <div className="col col-12 col-lg-7 flex items-stretch">
                      <div className="w-full min-h-280 rounded-12 bg-slate-100 flex items-center justify-center p-40" style={{ background: `linear-gradient(135deg, rgba(99,102,241,0.12), rgba(56,189,248,0.08))` }}>
                        <span className="text-64 opacity-30">{id === "ai" ? "🤖" : id === "finance" ? "💳" : "📋"}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="lqd-section py-80 bg-slate-50" id="client">
            <div className="container">
              <div className="row items-center">
                <div className="col col-12 col-lg-5">
                  <h6 className="ld-fh-element mb-2em text-primary uppercase text-12 font-bold">{t("landing.clientSectionEyebrow")}</h6>
                  <h2 className="ld-fh-element text-42 mb-0/5em">{t("landing.clientSectionTitle")}</h2>
                  <p className="ld-fh-element text-18 text-gray-600 mb-30">{t("landing.clientSectionSubtitle")}</p>
                  <RouterLink to="/client/login" className="btn btn-solid bg-primary rounded-100 text-white px-2em">
                    {t("landing.ctaClientPortal")}
                  </RouterLink>
                </div>
                <div className="col col-12 col-lg-7">
                  <div className="row">
                    {["trainingLog", "messaging", "desk", "clientUx"].map((key) => (
                      <div key={key} className="col col-12 col-sm-6 mb-20">
                        <div className="p-30 bg-white rounded-12 shadow-sm h-full">
                          <h3 className="text-18 font-semibold mb-10">{t(`landing.mini.${key}.title`)}</h3>
                          <p className="text-15 text-gray-600 mb-0">{t(`landing.mini.${key}.desc`)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="lqd-section py-90 text-center" id="cta">
            <div className="container">
              <div className="row justify-center">
                <div className="col col-12 col-lg-8">
                  <h2 className="ld-fh-element text-50 mb-0/5em">{t("landing.footerTitle")}</h2>
                  <p className="ld-fh-element text-18 text-gray-600 mb-30">{t("landing.footerSubtitle")}</p>
                  <RouterLink to="/register" className="btn btn-solid bg-primary rounded-100 text-white mx-10 mb-10 px-2em">
                    {t("landing.ctaCoach")}
                  </RouterLink>
                  <RouterLink to="/client/login" className="btn btn-default border-2 border-black-10 rounded-100 mx-10 mb-10 px-2em">
                    {t("landing.ctaClient")}
                  </RouterLink>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>

      <footer className="main-footer py-40 border-top border-black-10">
        <div className="container">
          <div className="row items-center">
            <div className="col col-12 col-md-6">
              <p className="mb-0 text-14 text-gray-500">{t("landing.footerCopy")}</p>
            </div>
            <div className="col col-12 col-md-6 text-end md:text-start">
              <RouterLink to="/login" className="text-14 text-gray-600 mr-20">{t("login.signIn")}</RouterLink>
              <RouterLink to="/client/login" className="text-14 text-gray-600">{t("clientAuth.clientPortal")}</RouterLink>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
