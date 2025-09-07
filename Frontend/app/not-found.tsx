"use client";
import React from "react";

export default function NotFound() {
  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700 }}>ページが見つかりません</h1>
      <p style={{ marginTop: 8 }}>
        指定されたページは存在しないか、移動した可能性があります。
      </p>
      <a href="/" style={{ color: "#2563eb", marginTop: 12, display: "inline-block" }}>
        トップへ戻る
      </a>
    </div>
  );
}

