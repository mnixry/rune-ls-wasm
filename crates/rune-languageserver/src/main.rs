mod stdin;

use anyhow::Result;
use clap::{Parser, ValueEnum};
use rune::{Options, languageserver};
use std::{fs::File, path::PathBuf, str::FromStr};
use tracing_appender::non_blocking::WorkerGuard;
use tracing_subscriber::{EnvFilter, Layer, fmt, layer::SubscriberExt, util::SubscriberInitExt};

#[derive(Debug, Clone, Copy, ValueEnum)]
enum LogFormat {
    Default,
    Compact,
    Pretty,
    Json,
}

#[derive(Parser, Debug)]
#[command(version, about, long_about = None)]
struct Args {
    #[arg(long)]
    log_filter: Option<String>,
    #[arg(long)]
    log_file: Option<PathBuf>,
    #[arg(long, default_value = "default")]
    log_format: LogFormat,
}

fn setup_logging(args: &Args) -> Result<WorkerGuard> {
    let env_filter = args
        .log_filter
        .as_ref()
        .and_then(|s| EnvFilter::from_str(s).ok())
        .unwrap_or_default();

    let (non_blocking, guard) = if let Some(path) = args.log_file.as_ref() {
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent)?;
        }
        let file_appender = File::options().append(true).create(true).open(path)?;
        tracing_appender::non_blocking(file_appender)
    } else {
        tracing_appender::non_blocking(std::io::stderr())
    };

    tracing_subscriber::registry()
        .with(env_filter)
        .with(match args.log_format {
            LogFormat::Default => fmt::layer().with_writer(non_blocking).boxed(),
            LogFormat::Pretty => fmt::layer().pretty().with_writer(non_blocking).boxed(),
            LogFormat::Compact => fmt::layer().compact().with_writer(non_blocking).boxed(),
            LogFormat::Json => fmt::layer().json().with_writer(non_blocking).boxed(),
        })
        .init();

    Ok(guard)
}

#[tokio::main(flavor = "current_thread")]
async fn main() -> Result<()> {
    let _guard = setup_logging(&Args::parse())?;

    let context = rune_modules::default_context()?;
    let options = Options::from_default_env()?;

    let languageserver = languageserver::builder()
        .with_context(context)
        .with_options(options)
        .with_output(tokio::io::stdout())
        .with_input(stdin::EmscriptenStdin::new())
        .build()?;

    match languageserver.run().await {
        Ok(()) => {
            tracing::info!("Server shutting down");
        }
        Err(error) => {
            tracing::error!("Server errored: {error}");
        }
    };
    Ok(())
}
