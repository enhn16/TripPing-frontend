package com.tripping.app;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.WebResourceRequest;
import android.webkit.WebView;
import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebViewClient;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // 카카오 로그인(JS SDK)이 카카오톡 앱 실행을 위해 intent://...#Intent;...;end 형태의
        // URL을 웹뷰에 띄우는데, Capacitor 기본 WebViewClient(Bridge.launchIntent())는 이 스킴을
        // new Intent(ACTION_VIEW, uri)로 그냥 실행 시도하다 ActivityNotFoundException을 만나고
        // 조용히 무시해버림 -> 로그인 버튼을 눌러도 아무 반응이 없었던 원인.
        // (카카오 하이브리드 앱 가이드: https://developers.kakao.com/docs/latest/ko/javascript/hybrid)
        //
        // intent:// 만 별도로 가로채서 제대로 파싱/실행하고, 그 외 URL은 전부 기존 Capacitor
        // 동작(super)에 그대로 위임 - 로컬 서버 로딩 등 다른 기능은 안 건드림.
        Bridge bridge = getBridge();
        bridge.setWebViewClient(new BridgeWebViewClient(bridge) {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();

                if (!"intent".equals(uri.getScheme())) {
                    return super.shouldOverrideUrlLoading(view, request);
                }

                try {
                    Intent intent = Intent.parseUri(uri.toString(), Intent.URI_INTENT_SCHEME);

                    if (intent.resolveActivity(getPackageManager()) != null) {
                        // 카카오톡이 설치돼 있으면 앱으로 전환해서 로그인
                        startActivity(intent);
                        return true;
                    }

                    // 카카오톡이 없는 기기: 카카오가 같이 내려주는 fallback URL(웹 로그인 페이지)을
                    // 그대로 이 웹뷰에 로드 -> 앱 전환 없이 인앱 로그인 계속 진행됨
                    String fallbackUrl = intent.getStringExtra("browser_fallback_url");
                    if (fallbackUrl != null) {
                        view.loadUrl(fallbackUrl);
                        return true;
                    }
                } catch (Exception e) {
                    // intent:// 파싱/실행에 실패해도 앱이 죽지 않고 현재 화면을 유지하도록 함
                }

                return true;
            }
        });
    }
}