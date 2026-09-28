/** PUT med progress. XHR eftersom fetch inte rapporterar uppladdningsförlopp. */
export function putWithProgress(
  url: string,
  blob: Blob,
  contentType: string,
  onProgress: (fraction: number) => void
) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", contentType);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(e.loaded / e.total);
    };
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new Error(`Uppladdningen misslyckades (${xhr.status})`));
    xhr.onerror = () => reject(new Error("Nätverksfel vid uppladdning"));
    xhr.send(blob);
  });
}
