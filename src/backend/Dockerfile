FROM glowman554/deno

COPY *.ts /src/
RUN deno cache /src/index.ts

ENTRYPOINT [ "deno", "run", "-A", "/src/index.ts", "/config/" ]