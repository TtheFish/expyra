using System.Buffers.Binary;
using System.IO.Compression;
using System.Text;

namespace Expyra.Infrastructure.Persistence.Seed;

/// <summary>
/// Demo ilanlar için 800×600 PNG üretir — repoya ikili görsel koymamak için.
/// İki renk arası dikey geçiş; <see cref="ImageProbe"/> boyutu IHDR'dan okuyor,
/// yani bu dosya gerçek bir görsel gibi doğrulamadan geçiyor.
///
/// <para>Minimal kodlayıcı: imza + IHDR + tek IDAT (zlib) + IEND. Filtre baytı 0.
/// CRC32, PNG'nin şart koştuğu tablo tabanlı hesap — dış paket almaya değmez.</para>
/// </summary>
internal static class DemoImage
{
    private static readonly uint[] CrcTable = BuildCrcTable();

    internal static byte[] Png(int width, int height, (byte R, byte G, byte B) top, (byte R, byte G, byte B) bottom)
    {
        var raw = new byte[height * (width * 3 + 1)];
        var offset = 0;

        for (var y = 0; y < height; y++)
        {
            raw[offset++] = 0;
            var t = (double)y / Math.Max(1, height - 1);
            var r = (byte)Math.Round(top.R + (bottom.R - top.R) * t);
            var g = (byte)Math.Round(top.G + (bottom.G - top.G) * t);
            var b = (byte)Math.Round(top.B + (bottom.B - top.B) * t);

            for (var x = 0; x < width; x++)
            {
                // Hafif yatay doku: düz gradyan jpeg gibi görünmesin.
                var shade = (byte)((x / 40 + y / 40) % 2 == 0 ? 0 : 6);
                raw[offset++] = (byte)Math.Max(0, r - shade);
                raw[offset++] = (byte)Math.Max(0, g - shade);
                raw[offset++] = (byte)Math.Max(0, b - shade);
            }
        }

        using var compressed = new MemoryStream();
        using (var zlib = new ZLibStream(compressed, CompressionLevel.Optimal, leaveOpen: true))
        {
            zlib.Write(raw);
        }

        using var output = new MemoryStream();
        output.Write([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

        var ihdr = new byte[13];
        BinaryPrimitives.WriteInt32BigEndian(ihdr.AsSpan(0, 4), width);
        BinaryPrimitives.WriteInt32BigEndian(ihdr.AsSpan(4, 4), height);
        ihdr[8] = 8;  // bit depth
        ihdr[9] = 2;  // truecolor
        WriteChunk(output, "IHDR", ihdr);
        WriteChunk(output, "IDAT", compressed.ToArray());
        WriteChunk(output, "IEND", []);

        return output.ToArray();
    }

    private static void WriteChunk(Stream output, string type, byte[] data)
    {
        var typeBytes = Encoding.ASCII.GetBytes(type);
        var length = new byte[4];
        BinaryPrimitives.WriteInt32BigEndian(length, data.Length);
        output.Write(length);
        output.Write(typeBytes);
        output.Write(data);

        var crc = Crc32(typeBytes, data);
        var crcBytes = new byte[4];
        BinaryPrimitives.WriteUInt32BigEndian(crcBytes, crc);
        output.Write(crcBytes);
    }

    private static uint Crc32(byte[] first, byte[] second)
    {
        var crc = 0xFFFFFFFFu;
        foreach (var b in first) crc = CrcTable[(crc ^ b) & 0xFF] ^ (crc >> 8);
        foreach (var b in second) crc = CrcTable[(crc ^ b) & 0xFF] ^ (crc >> 8);
        return crc ^ 0xFFFFFFFFu;
    }

    private static uint[] BuildCrcTable()
    {
        var table = new uint[256];
        for (uint n = 0; n < 256; n++)
        {
            var c = n;
            for (var k = 0; k < 8; k++)
            {
                c = (c & 1) != 0 ? 0xEDB88320u ^ (c >> 1) : c >> 1;
            }

            table[n] = c;
        }

        return table;
    }
}
