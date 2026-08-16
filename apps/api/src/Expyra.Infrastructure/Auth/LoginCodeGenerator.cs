using System.Globalization;
using System.Security.Cryptography;
using Expyra.Application.Common.Interfaces;

namespace Expyra.Infrastructure.Auth;

internal sealed class LoginCodeGenerator : ILoginCodeGenerator
{
    /// <summary>4 haneden kısa kod ölçülebilir bir güvenlik değeri taşımıyor.</summary>
    private const int MinDigits = 4;

    /// <summary>10 hane 10^10 eder ve int taşar; üst sınır bu yüzden 9.</summary>
    private const int MaxDigits = 9;

    public string Generate(int digits)
    {
        ArgumentOutOfRangeException.ThrowIfLessThan(digits, MinDigits);
        ArgumentOutOfRangeException.ThrowIfGreaterThan(digits, MaxDigits);

        var exclusiveMax = 1;
        for (var i = 0; i < digits; i++)
        {
            exclusiveMax *= 10;
        }

        // Random.Shared YASAK (CA5394) ve GetInt32 modulo bias'ı kendi çözüyor.
        var value = RandomNumberGenerator.GetInt32(0, exclusiveMax);

        // Biçim dizesi ELDE kuruluyor: $"D{digits}" yazılsaydı hane sayısı geçerli
        // kültürle metne çevrilirdi ve Arapça kültürde "D٦" gibi bir biçim çıkardı.
        // Değerin kendisi de InvariantCulture ile basılıyor — yoksa baştaki sıfırlar
        // korunsa bile rakamlar Arap-Hint olurdu.
        var format = "D" + digits.ToString(CultureInfo.InvariantCulture);
        return value.ToString(format, CultureInfo.InvariantCulture);
    }
}
