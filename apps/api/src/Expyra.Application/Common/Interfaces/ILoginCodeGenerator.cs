namespace Expyra.Application.Common.Interfaces;

/// <summary>
/// Tek kullanımlık kod üretici. Implementasyon <c>RandomNumberGenerator.GetInt32</c>
/// kullanır — <c>Random.Shared</c> YASAK (CA5394) ve <c>GetInt32</c> modulo bias'ı
/// kendi çözer.
/// </summary>
public interface ILoginCodeGenerator
{
    /// <summary>
    /// Yalnız <c>0-9</c> içeren, tam <paramref name="digits"/> uzunluğunda kod.
    /// Baştaki sıfırlar korunur (<c>"D6"</c> + InvariantCulture; kültür verilmezse
    /// Arapça kültürde Arap-Hint rakamı basar).
    /// </summary>
    string Generate(int digits);
}
