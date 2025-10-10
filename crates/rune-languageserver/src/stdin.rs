use std::{
    pin::Pin,
    task::{Context, Poll},
};

use tokio::io::{self, AsyncRead, ReadBuf};

pub(crate) struct EmscriptenStdin {
    inner: tokio::io::Stdin,
}

impl EmscriptenStdin {
    pub(crate) fn new() -> Self {
        Self {
            inner: tokio::io::stdin(),
        }
    }
}

#[cfg(target_os = "emscripten")]
unsafe extern "C" {
    fn emscripten_sleep(ms: ::std::os::raw::c_uint);
}

impl AsyncRead for EmscriptenStdin {
    #[cfg(target_os = "emscripten")]
    fn poll_read(
        mut self: Pin<&mut Self>,
        cx: &mut Context<'_>,
        buf: &mut ReadBuf<'_>,
    ) -> Poll<io::Result<()>> {
        loop {
            match Pin::new(&mut self.inner).poll_read(cx, buf) {
                Poll::Ready(Err(e)) if e.kind() == std::io::ErrorKind::WouldBlock => unsafe {
                    emscripten_sleep(100);
                },
                result => return result,
            };
        }
    }

    #[cfg(not(target_os = "emscripten"))]
    fn poll_read(
        mut self: Pin<&mut Self>,
        cx: &mut Context<'_>,
        buf: &mut ReadBuf<'_>,
    ) -> Poll<io::Result<()>> {
        Pin::new(&mut self.inner).poll_read(cx, buf)
    }
}
