namespace Expyra.Application.Common.Interfaces;

/// <summary>
/// DateTime.UtcNow'u doğrudan çağırma — test edilemez hale gelir. Bunu enjekte et.
/// </summary>
public interface IDateTimeProvider
{
    DateTimeOffset UtcNow { get; }
}

public static class DateTimeOffsetExtensions
{
    /// <summary>
    /// Zamanı PostgreSQL'in çözünürlüğüne indirir.
    ///
    /// <para>.NET 100 ns çözünürlükte üretiyor, <c>timestamptz</c> mikrosaniye saklıyor.
    /// Kesmezsek yazdığımız değer okuduğumuz değere eşit olmaz: aynı kaydı iki kez
    /// döndüren bir uç iki farklı zaman damgası verir. Fark 100 ns, ama eşitlik
    /// karşılaştırması ikili — istemci "değişmiş" sanır.</para>
    ///
    /// <para>Yuvarlama değil KESME: veritabanının yaptığı da bu. Amaç en yakın değeri
    /// bulmak değil, saati deponun çözünürlüğüne hizalamak.</para>
    ///
    /// <para>Bunu <see cref="IDateTimeProvider"/> uygulayan HER sınıf çağırmalı —
    /// testteki sahte saat dahil. Yalnız üretim sağlayıcısı keserse testler, üretimde
    /// var olmayan bir hassasiyet farkı üretir ve sahte kırmızı verir.</para>
    /// </summary>
    public static DateTimeOffset TruncateToMicroseconds(this DateTimeOffset value)
        => new(value.Ticks - (value.Ticks % TimeSpan.TicksPerMicrosecond), value.Offset);
}
