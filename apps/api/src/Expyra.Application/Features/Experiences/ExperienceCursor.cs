using System.Buffers.Binary;
using System.Buffers.Text;

namespace Expyra.Application.Features.Experiences;

/// <summary>
/// İlan listelerinin sayfa sınırı: <c>(sıralama damgası, id)</c> çiftinin taşınabilir hâli.
/// Misafir listesinde damga <c>published_at_utc</c>, host listesinde <c>created_at_utc</c>
/// (host taslaklarını da görüyor ve taslağın yayın damgası yok). Cursor hangi listenin
/// olduğunu taşımıyor; öbür listeye verilirse yalnızca anlamsız bir yer imi olur — yetki
/// değil, her iki sorgu da kendi filtresini (yayında / host'un kendisi) ayrıca uyguluyor.
///
/// <para><b>Neden keyset (cursor), OFFSET değil:</b> <c>OFFSET 24</c> ile ikinci sayfayı
/// isteyen bir misafir, arada yeni bir ilan yayınlandıysa ilk sayfanın son satırını BİR
/// KEZ DAHA görür; bir ilan arşivlendiyse hiç görmediği bir satır atlanır. Keyset'te
/// sınır bir sayı değil, gerçek bir satırın yeri — araya giren yazma işlemleri sayfaları
/// kaydırmıyor. Ayrıca OFFSET, derinleştikçe atlanan satırları da okumak zorunda.</para>
///
/// <para><b>Neden <c>published_at_utc</c>, <c>created_at_utc</c> değil:</b> ocakta yazılıp
/// haziranda yayınlanan bir ilan, rafta haziran ilanıdır. <c>created_at_utc</c> (ve onunla
/// aynı yönde giden Guid v7 <c>id</c>) host'un YAZMAYA BAŞLADIĞI anı taşıyor; sıralama
/// ona bağlansaydı liste, taslak yaşına göre dizilirdi. Damga ilk yayında bir kez yazılıp
/// bir daha tazelenmiyor (<c>Experience.PublishedAtUtc</c>), yani sayfa sınırı sabit —
/// yeniden yayınlanan bir ilan sayfalar arasında zıplamıyor.</para>
///
/// <para><b>İkincil anahtar ŞART:</b> aynı saniyede yayınlanan iki ilan (toplu içe
/// aktarma, çift tıklama) yalnız zaman damgasıyla sıralanırsa sıraları belirsiz kalır;
/// iki ardışık sayfa isteği aynı satırı iki kez ya da hiç döndürmez.
/// <c>id</c> benzersiz olduğu için ikinci anahtar toplam sırayı KESİN yapıyor.</para>
///
/// <para><b>Neden opak (base64url), <c>"tarih,id"</c> gibi okunur bir metin değil:</b>
/// okunur bir cursor, istemcinin onu ELLE kurmasına davetiye — o an sıralama alanı
/// sözleşmenin parçası olur ve değiştirilemez hâle gelir. İçinde sır yok, bu yüzden
/// imzalanmıyor da: cursor bir yetki değil, yalnızca bir yer imi.</para>
/// </summary>
internal readonly record struct ExperienceCursor(DateTimeOffset SortedAtUtc, Guid Id)
{
    private const int TicksLength = sizeof(long);
    private const int IdLength = 16;
    private const int ByteLength = TicksLength + IdLength;

    /// <summary>24 bayt → dolgusuz base64url tam 32 karakter. Başka uzunluk kabul edilmiyor.</summary>
    internal const int EncodedLength = 32;

    /// <summary>
    /// Zaman damgası TICK olarak yazılıyor, unix saniye/milisaniye olarak değil:
    /// <c>timestamptz</c> mikrosaniye hassasiyetinde ve yuvarlanmış bir cursor, aynı
    /// milisaniyede yayınlanmış satırları ya atlar ya iki kez gösterir.
    /// </summary>
    internal string Encode()
    {
        Span<byte> buffer = stackalloc byte[ByteLength];

        // Big-endian: baytlar zaman sırasına göre diziliyor, yani kodlanmış cursor'ın
        // metin sırası da zaman sırası. Doğruluk için gerekmiyor, hata ayıklarken bedava.
        BinaryPrimitives.WriteInt64BigEndian(buffer, SortedAtUtc.UtcTicks);

        if (!Id.TryWriteBytes(buffer[TicksLength..]))
        {
            // 16 baytlık hedefte başarısız olamaz; yine de sessizce geçmiyor (CLAUDE.md #1).
            throw new InvalidOperationException("Cursor kimliği yazılamadı.");
        }

        return Base64Url.EncodeToString(buffer);
    }

    /// <summary>
    /// Çözülemeyen cursor <c>false</c> döner ve çağıran bunu <b>400</b>'e çeviriyor.
    ///
    /// <para>Sessizce başa sarmak (ilk sayfayı döndürmek) YASAK: sayfalayan bir istemci
    /// sonsuz döngüye girer — hep aynı 24 satırı alır, hiç bitmez ve hiçbir yerde hata
    /// görünmez.</para>
    /// </summary>
    internal static bool TryDecode(string? raw, out ExperienceCursor cursor)
    {
        cursor = default;

        if (raw is null || raw.Length != EncodedLength)
        {
            return false;
        }

        Span<byte> buffer = stackalloc byte[ByteLength];

        // `Try` önekine rağmen FIRLATIYOR: alfabe dışı karakterde
        // `Base64Url.TryDecodeFromChars` FormatException atıyor, false dönmüyor.
        // Yakalamazsak elle düzenlenmiş bir query string 400 yerine 500 üretir.
        // Bu hata YUTMA değil: metodun sözleşmesi "çözülemezse false" ve
        // FormatException tam olarak "çözülemedi" demek.
        int written;
        try
        {
            if (!Base64Url.TryDecodeFromChars(raw, buffer, out written))
            {
                return false;
            }
        }
        catch (FormatException)
        {
            return false;
        }

        if (written != ByteLength)
        {
            return false;
        }

        var ticks = BinaryPrimitives.ReadInt64BigEndian(buffer);

        // Aralık kontrolü: DateTimeOffset yapıcısı aralık dışı tick için fırlatır ve
        // bir query string değeri yüzünden 500 görmek istemiyoruz.
        if (ticks < 0 || ticks > DateTime.MaxValue.Ticks)
        {
            return false;
        }

        cursor = new ExperienceCursor(
            new DateTimeOffset(ticks, TimeSpan.Zero),
            new Guid(buffer[TicksLength..]));

        return true;
    }
}
