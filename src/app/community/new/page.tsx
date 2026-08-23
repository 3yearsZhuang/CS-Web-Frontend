/**
 * @file Publish community content — focused task shell without immersive hero
 */
'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { ArrowLeft, FileText } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button, SectionLoading } from '@/components';
import { ComposeForm } from '@/modules/community/ui/compose-form';
import { useCompose } from '@/modules/community/ui/hooks/use-compose';

export default function ComposePage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen pt-16 flex items-center justify-center pixel-page">
          <SectionLoading label="Loading..." />
        </main>
      }
    >
      <ComposePageContent />
    </Suspense>
  );
}

function ComposePageContent() {
  const c = useCompose();
  const t = useTranslations('communityNew');

  if (!c.authChecked || c.loadingCats) {
    return <main className="min-h-screen pt-16 flex items-center justify-center pixel-page"><SectionLoading label="Loading..." /></main>;
  }

  if (!c.isLoggedIn) {
    return (
      <main className="min-h-screen pt-16 pixel-page">
        <section className="flex min-h-[70vh] items-center justify-center px-4">
          <div className="max-w-md border border-[var(--border)] bg-[var(--card)] p-8 text-center sm:p-12">
            <FileText className="mx-auto mb-5 h-8 w-8 text-[var(--primary)]" />
            <h1 className="mb-4 display-serif text-4xl text-[var(--foreground)]">{t('loginRequiredTitle1')}{t('loginRequiredTitle2')}</h1>
            <p className="mb-7 text-sm leading-7 text-[var(--muted-foreground)]">{t('loginRequiredDesc')}</p>
            <Button onClick={() => c.router.push('/login?redirect=/community/new')}>{t('loginNow')}</Button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--background)] pt-16 pixel-page">
      <header className="sticky top-16 z-[var(--z-sticky)] border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--background)_94%,transparent)] backdrop-blur-xl">
        <div className="mx-auto flex min-h-16 max-w-[1200px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link href="/community" className="inline-flex min-h-10 items-center gap-2 text-sm text-[var(--muted-foreground)] hover:text-[var(--primary)] focus-ring">
            <ArrowLeft className="h-4 w-4" /> {t('backToAll')}
          </Link>
          <span className="meta-mono hidden sm:inline">Markdown / Autosaved locally</span>
        </div>
      </header>

      <section className="mx-auto max-w-[1200px] px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <div className="mb-8 max-w-3xl">
          <div className="section-marker mb-3">[ 00 ] — Compose</div>
          <h1 className="mb-3 display-serif text-[clamp(32px,5vw,56px)] text-[var(--foreground)]">{t('heroTitle1')}<span className="text-[var(--primary)]">{t('heroTitle2')}</span></h1>
          <p className="text-sm leading-7 text-[var(--muted-foreground)]">{t('heroDesc')}</p>
        </div>
        <ComposeForm {...c} />
      </section>
    </main>
  );
}
