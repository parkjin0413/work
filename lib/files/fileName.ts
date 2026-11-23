/**
 * 업로드한 파일 이름 바로잡기.
 * Next.js 14 서버 액션은 파일 이름(UTF-8)을 Latin-1 로 읽어서 "통장사본.jpg" 가 "íµì¥ì¬ë³¸.jpg" 처럼 깨진다.
 * 이름이 Latin-1 범위 글자로만 되어 있고, 그걸 다시 UTF-8 로 읽었을 때 온전한 글자가 되면 그 이름을 쓴다.
 * 원래부터 영어·숫자인 이름이나 이미 올바른 한글 이름은 그대로 둔다.
 */
export function fixUploadedFileName(name: string): string {
  if (!/[\u0080-ÿ]/.test(name) || /[^\u0000-ÿ]/.test(name)) return name;
  const decoded = Buffer.from(name, "latin1").toString("utf8");
  return decoded.includes("�") ? name : decoded;
}
