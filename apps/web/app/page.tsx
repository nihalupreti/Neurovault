"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/header";
import { VaultRail } from "@/components/vault-rail";
import { ReadingView } from "@/components/reading-view";
import { RightRail } from "@/components/right-rail";
import type { RailMode } from "@/components/right-rail";
import { CommandPalette } from "@/components/command-palette";
import { LeftDrawer, RightDrawer, Fab } from "@/components/mobile-drawers";
import { useMobile } from "@/hooks/useMobile";
import { getFile } from "@/api/client";
import { useDynamicTitle } from "@/hooks/useDynamicTitle";

export default function Home() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100vh",
            color: "var(--ink-faint)",
            fontFamily: "var(--mono)",
            fontSize: 12,
          }}
        >
          Loading...
        </div>
      }
    >
      <HomeContent />
    </Suspense>
  );
}

function HomeContent() {
  const mobile = useMobile();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [searchOpen, setSearchOpen] = useState(false);
  const [rightMode, setRightMode] = useState<RailMode>("outline");
  const activeFileId = searchParams.get("file");
  const activeFolderName = "";
  const [leftDrawer, setLeftDrawer] = useState(false);
  const [rightDrawer, setRightDrawer] = useState(false);

  const { data: fileContent } = useQuery({
    queryKey: ["file", activeFileId],
    queryFn: () => getFile(activeFileId!),
    enabled: !!activeFileId,
  });

  const activeFileLabel = (() => {
    if (!fileContent) return null;
    const heading = /^#\s+(.+)$/m.exec(fileContent);
    return heading?.[1]?.trim() ?? null;
  })();

  useDynamicTitle(activeFileLabel);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const handleSelectFile = useCallback(
    (id: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("file", id);
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [searchParams, router],
  );

  const handleChatToggle = useCallback(() => {
    if (mobile) {
      setRightDrawer(true);
      setRightMode("chat");
    } else {
      setRightMode((prev) => (prev === "chat" ? "outline" : "chat"));
    }
  }, [mobile]);

  const handleAskVault = useCallback(() => {
    setRightMode("chat");
    if (mobile) setRightDrawer(true);
  }, [mobile]);

  return (
    <>
      <Header
        onSearchOpen={() => setSearchOpen(true)}
        onChatToggle={handleChatToggle}
        chatOpen={rightMode === "chat"}
        onMenu={() => setLeftDrawer(true)}
        mobile={mobile}
      />

      <div className="nv-shell">
        {!mobile && <VaultRail activeId={activeFileId} onSelectFile={handleSelectFile} />}

        <ReadingView
          fileId={activeFileId}
          fileName={activeFileLabel ?? "Select a file"}
          folderName={activeFolderName}
        />

        {!mobile && (
          <RightRail
            mode={rightMode}
            onModeChange={setRightMode}
            fileId={activeFileId}
            fileContent={fileContent}
            onSelectFile={handleSelectFile}
          />
        )}
      </div>

      {mobile && <Fab onClick={() => setRightDrawer(true)} />}

      <LeftDrawer
        open={mobile && leftDrawer}
        onClose={() => setLeftDrawer(false)}
        activeId={activeFileId}
        onSelectFile={handleSelectFile}
      />

      <RightDrawer
        open={mobile && rightDrawer}
        onClose={() => setRightDrawer(false)}
        mode={rightMode}
        onModeChange={setRightMode}
        fileId={activeFileId}
        fileContent={fileContent}
        onSelectFile={handleSelectFile}
      />

      <CommandPalette
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        onSelectFile={handleSelectFile}
        onAskVault={handleAskVault}
      />
    </>
  );
}
