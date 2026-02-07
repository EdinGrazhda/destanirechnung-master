export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(
  req: NextRequest,
  { params }: { params: { filename: string } }
) {
  const fileName = params.filename;

  if (!fileName) {
    return new NextResponse("Filename must be specified", { status: 400 });
  }

  const filePath = path.join(process.cwd(), 'public', 'uploaded', fileName);

  if (!fs.existsSync(filePath)) {
    return new NextResponse('File not found', { status: 404 });
  }

  const contentTypeMap: { [key: string]: string } = {
    svg: 'image/svg+xml',
    ico: 'image/x-icon',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    pdf: 'application/pdf',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  };

  const fileExtension = fileName.split('.').pop()?.toLowerCase();
  const contentType = contentTypeMap[fileExtension || ''] || 'application/octet-stream';

  const headers = new Headers({
    'Content-Disposition': `inline; filename="${fileName}"`,
    'Content-Type': contentType,
  });

  const fileStream = fs.createReadStream(filePath);
  return new NextResponse(fileStream as any, { headers });
}
