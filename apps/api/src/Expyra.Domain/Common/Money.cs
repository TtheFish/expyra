using System.Globalization;

namespace Expyra.Domain.Common;

/// <summary>
/// Para tutarı: <c>(minör birim tam sayısı, ISO 4217 kodu)</c>.
///
/// <para><b>Neden <c>long</c> minör birim, <c>decimal(18,2)</c> değil</b> — bu karar
/// Blok 7 (fiyat) ve Blok 11 (komisyon) girmeden kapanmak zorundaydı:</para>
/// <list type="number">
/// <item>ISO 4217 üssü para birimine göre değişiyor: JPY 0 (yen'in altı yok),
/// KWD/BHD/OMR/JOD/TND 3 (1 dinar = 1000 fils), çoğunluk 2. Tek bir
/// <c>decimal(18,2)</c> hepsine 2 dayatır: 1.234 KWD sessizce 1.23'e yuvarlanır ve
/// her satırda 4 fils kaybolur. Yuvarlama <b>gerçek para kaybıdır</b>, biçim sorunu değil.</item>
/// <item><c>decimal(18,4)</c> 3 haneyi taşırdı ama "0.005 KWD" gibi <b>var olmayan</b>
/// tutarları da temsil edilebilir kılardı. Tam sayı minör birimde en küçük temsil
/// edilebilir değer = en küçük gerçek değer; geçersiz tutar yazılamaz.</item>
/// <item>Komisyon ve kur çevrimi tam sayı aritmetiğinde <b>kesin</b>; yuvarlama tek bir
/// açık adıma sıkışıyor (<see cref="Allocate"/>, <see cref="MultiplyBy"/>,
/// <see cref="ConvertTo"/>) ve o adım <c>MidpointRounding</c>'i çağırandan istiyor.
/// Ondalık tipte yuvarlama her toplamada sessizce dağılırdı.</item>
/// </list>
/// <para><c>long</c> tavanı 9.2·10^18 minör birim; 3 haneli bir para biriminde bile
/// 9.2·10^15 ana birim eder — pratikte sınır yok.</para>
///
/// <para><b>Neden sınıf, <c>readonly record struct</c> değil:</b> struct'ın
/// <c>default</c> değeri <c>(0, null)</c> olurdu ve <c>new Money[n]</c>, atanmamış alan
/// ya da EF materyalizasyonu bunu sessizce üretirdi. Bu repoda geçersiz durum sessiz
/// değil yüksek sesli olmak zorunda (CLAUDE.md #1); referans tipte NRT ve çalışma anı
/// zaten koruyor.</para>
///
/// <para><b>EF eşlemesi (Blok 7'de yazılacak):</b> sahip tablonun İKİ sütununa açılan
/// bir <i>owned type</i> — <c>&lt;alan&gt;_amount_minor bigint</c> +
/// <c>&lt;alan&gt;_currency_code varchar(3)</c>, ikincisi <c>currency.code</c>'a FK.
/// Ayrı tablo değil (join istemez), tek sütunda serileştirme değil (SQL tarafında
/// toplanamaz, filtrelenemez). Owned navigation <c>IsRequired()</c> ile işaretlenmeli;
/// aksi halde EF onu "optional dependent" sayar ve tüm sütunlar dolu olsa bile bir gün
/// <c>null</c> materyalize eder.</para>
///
/// <para><b>Üs (minör birim hane sayısı) burada TUTULMAZ.</b> Kayıt defteri
/// <c>currency.minor_units</c>'tir; kopyalanırsa iki kaynak ayrışır. Üsse ihtiyaç duyan
/// tek iki işlem (<see cref="ToDecimal"/> ve <see cref="ConvertTo"/>) onu parametre
/// olarak ister. Toplama, çıkarma ve karşılaştırma üsse hiç ihtiyaç duymaz — aynı para
/// biriminin üssü aynıdır.</para>
///
/// <para><b>Biçimlendirme bu tipin işi değil.</b> Sembol yerleşimi, binlik ayracı ve
/// negatif gösterimi locale'e bağlı; arayüzde <c>Intl.NumberFormat</c> yapıyor
/// (docs/I18N.md §5). <see cref="ToString"/> yalnızca log ve teşhis içindir.</para>
/// </summary>
public sealed record Money : IComparable<Money>
{
    // 10^0 .. 10^4 — ISO 4217 üs aralığı (CurrencyCode.MaxMinorUnits).
    private static readonly decimal[] Scales = [1m, 10m, 100m, 1_000m, 10_000m];

    /// <param name="amountMinor">
    /// Minör birim cinsinden tutar: 12.34 EUR → 1234, 100 JPY → 100, 1.234 KWD → 1234.
    /// Negatif değer GEÇERLİ: iade (Blok 13) ve düzeltme kalemleri negatif tutar taşır.
    /// </param>
    /// <param name="currency">ISO 4217 alfabetik kod; büyük harfe normalize edilir.</param>
    public Money(long amountMinor, string currency)
    {
        AmountMinor = amountMinor;
        Currency = CurrencyCode.Normalize(currency);
    }

    public long AmountMinor { get; }

    /// <summary>
    /// ISO 4217 kodu. Adı <c>CurrencyCode</c> DEĞİL: o ad bu namespace'teki
    /// doğrulayıcı sınıfı gölgeler ve tip içinden çağrılamaz hale getirir.
    /// </summary>
    public string Currency { get; }

    public bool IsZero => AmountMinor == 0;

    public bool IsNegative => AmountMinor < 0;

    public static Money Zero(string currency) => new(0, currency);

    /// <summary>
    /// Verilen para biriminde, ana birim cinsinden bir ondalıktan kurar.
    /// Üs ve yuvarlama AÇIKÇA istenir — varsayılan yok, çünkü "hangi yuvarlama"
    /// sorusunun sessiz bir cevabı yanlış cevaptır.
    /// </summary>
    public static Money FromDecimal(decimal amount, string currency, int minorUnits, MidpointRounding rounding)
    {
        var scaled = Math.Round(amount * Scale(minorUnits), 0, rounding);

        // decimal → long dönüşümü aralık dışında OverflowException fırlatır; yakalanmıyor.
        return new Money((long)scaled, currency);
    }

    /// <summary>
    /// Ana birim cinsinden ondalık karşılığı. Yalnız gösterim ve dışa aktarım için;
    /// hesap DAİMA minör birimde yapılır.
    /// </summary>
    /// <param name="minorUnits"><c>currency.minor_units</c> — kayıt defterinden okunur.</param>
    public decimal ToDecimal(int minorUnits) => AmountMinor / Scale(minorUnits);

    public Money Add(Money other)
    {
        ArgumentNullException.ThrowIfNull(other);
        EnsureSameCurrency(other);

        return new Money(checked(AmountMinor + other.AmountMinor), Currency);
    }

    public Money Subtract(Money other)
    {
        ArgumentNullException.ThrowIfNull(other);
        EnsureSameCurrency(other);

        return new Money(checked(AmountMinor - other.AmountMinor), Currency);
    }

    /// <summary>Tam katı — kişi sayısı gibi. Yuvarlama gerekmez, kayıp olamaz.</summary>
    public Money Multiply(int factor) => new(checked(AmountMinor * factor), Currency);

    public Money Negate() => new(checked(-AmountMinor), Currency);

    /// <summary>
    /// Kesirli çarpım (indirim, vergi oranı). <paramref name="rounding"/> zorunlu:
    /// 1233 kuruşun %15'i 184.95'tir ve neyin doğru olduğu iş kararıdır, tipin değil.
    ///
    /// <para><b>Komisyon için bunu değil <see cref="Allocate"/>'i kullan:</b> platform
    /// payı ile host payı ayrı ayrı yuvarlanırsa toplamları ödenen tutarı tutmaz ve
    /// muhasebe bir kuruş açık verir.</para>
    /// </summary>
    public Money MultiplyBy(decimal factor, MidpointRounding rounding)
        => new((long)Math.Round(AmountMinor * factor, 0, rounding), Currency);

    /// <summary>
    /// Tutarı verilen oranlara böler. <b>Parçaların toplamı DAİMA bu tutara eşittir</b> —
    /// bölünemeyen artık kuruş ilk paylardan başlayarak dağıtılır, yaratılmaz ve
    /// kaybedilmez. Komisyonun (Blok 11) doğru yolu budur: <c>Allocate(15, 85)</c>.
    /// </summary>
    /// <param name="ratios">Negatif olmayan ağırlıklar; toplamları sıfırdan büyük olmalı.</param>
    public IReadOnlyList<Money> Allocate(params int[] ratios)
    {
        ArgumentNullException.ThrowIfNull(ratios);

        if (ratios.Length == 0)
        {
            throw new ArgumentException("En az bir oran verilmeli.", nameof(ratios));
        }

        long total = 0;
        foreach (var ratio in ratios)
        {
            if (ratio < 0)
            {
                throw new ArgumentException("Oranlar negatif olamaz.", nameof(ratios));
            }

            total += ratio;
        }

        if (total == 0)
        {
            throw new ArgumentException("Oranların toplamı sıfır olamaz.", nameof(ratios));
        }

        var shares = new long[ratios.Length];
        var remainder = AmountMinor;

        for (var i = 0; i < ratios.Length; i++)
        {
            // Int128: tutar büyükse ara çarpım long'u taşırabilir. Bölme sıfıra doğru
            // kırpıyor, dolayısıyla artık daima tutarla aynı işarette ve |artık| < parça sayısı.
            shares[i] = (long)((Int128)AmountMinor * ratios[i] / total);
            remainder -= shares[i];
        }

        var step = remainder >= 0 ? 1 : -1;
        var index = 0;
        while (remainder != 0)
        {
            shares[index] += step;
            remainder -= step;
            index = (index + 1) % shares.Length;
        }

        var result = new Money[shares.Length];
        for (var i = 0; i < shares.Length; i++)
        {
            result[i] = new Money(shares[i], Currency);
        }

        return result;
    }

    /// <summary>
    /// Kur çevrimi. <b>Açık bir adım</b> — toplama/çıkarma sırasında asla kendiliğinden
    /// olmaz. Kaynak ve hedef üssü ayrı ayrı istenir çünkü EUR→JPY çevriminde hedefin
    /// minör birimi yoktur; tek bir üs varsayan kod 165 yeni 1.65 yen yapar.
    ///
    /// <para>Oranın nereden geldiği (snapshot mı, canlı mı) Blok 7'nin sorunu; bu tip
    /// oranı hazır alır ve yalnız aritmetiği garanti eder. Tahsilat her zaman host'un
    /// para biriminde yapılır (VISION §9) — çevrim yalnız GÖSTERİM içindir.</para>
    /// </summary>
    public Money ConvertTo(
        string targetCurrency,
        decimal rate,
        int sourceMinorUnits,
        int targetMinorUnits,
        MidpointRounding rounding)
    {
        var sourceScale = Scale(sourceMinorUnits);
        var targetScale = Scale(targetMinorUnits);

        var converted = AmountMinor * rate * targetScale / sourceScale;

        return new Money((long)Math.Round(converted, 0, rounding), targetCurrency);
    }

    /// <summary>
    /// Aynı para biriminde sıralama. Farklı para birimlerini karşılaştırmak anlamsız
    /// olduğu için fırlatır — kur olmadan "10 EUR mu 300 TRY mi büyük" sorusunun
    /// cevabı yoktur ve sessiz bir cevap yanlış filtre demektir.
    /// </summary>
    public int CompareTo(Money? other)
    {
        if (other is null)
        {
            return 1;
        }

        EnsureSameCurrency(other);

        return AmountMinor.CompareTo(other.AmountMinor);
    }

    public static Money operator +(Money left, Money right)
    {
        ArgumentNullException.ThrowIfNull(left);
        return left.Add(right);
    }

    public static Money operator -(Money left, Money right)
    {
        ArgumentNullException.ThrowIfNull(left);
        return left.Subtract(right);
    }

    public static Money operator -(Money value)
    {
        ArgumentNullException.ThrowIfNull(value);
        return value.Negate();
    }

    public static Money operator *(Money left, int right)
    {
        ArgumentNullException.ThrowIfNull(left);
        return left.Multiply(right);
    }

    public static bool operator <(Money left, Money right)
        => Compare(left, right) < 0;

    public static bool operator >(Money left, Money right)
        => Compare(left, right) > 0;

    public static bool operator <=(Money left, Money right)
        => Compare(left, right) <= 0;

    public static bool operator >=(Money left, Money right)
        => Compare(left, right) >= 0;

    /// <summary>Log ve teşhis biçimi. Kullanıcıya gösterilecek metin DEĞİL (bkz. sınıf notu).</summary>
    public override string ToString()
        => string.Create(CultureInfo.InvariantCulture, $"{AmountMinor} {Currency} (minor)");

    /// <summary>
    /// Karşılaştırma operatörlerinin adlandırılmış karşılığı (CA2225).
    /// Aynı para birimi şartı <see cref="CompareTo"/> ile aynıdır.
    /// </summary>
    public static int Compare(Money left, Money right)
    {
        ArgumentNullException.ThrowIfNull(left);
        return left.CompareTo(right);
    }

    private static decimal Scale(int minorUnits)
        => minorUnits is >= 0 and <= CurrencyCode.MaxMinorUnits
            ? Scales[minorUnits]
            : throw new ArgumentOutOfRangeException(
                nameof(minorUnits),
                minorUnits,
                string.Create(
                    CultureInfo.InvariantCulture,
                    $"ISO 4217 minör birim üssü 0 ile {CurrencyCode.MaxMinorUnits} arasında olmalı."));

    private void EnsureSameCurrency(Money other)
    {
        if (!string.Equals(Currency, other.Currency, StringComparison.Ordinal))
        {
            // Sessiz dönüşüm YOK (CLAUDE.md #1): kuru bilmeden yapılan bir toplama,
            // sonucu yanlış olan ama hata vermeyen bir fatura üretir.
            throw new InvalidOperationException(
                $"Farklı para birimleri doğrudan işlenemez: {Currency} ve {other.Currency}. " +
                "Kur çevrimi açık bir adımdır (ConvertTo).");
        }
    }
}
