using Expyra.Domain.Common;

namespace Expyra.Domain.Scheduling;

/// <summary>
/// "Şu tarihlerde yokum." Host'un tatili, hastalığı, bakım günü.
///
/// <para><b>Blackout ile tek seans kapatmak farklı şeyler</b> ve ikisi de gerekli:
/// blackout ileriye dönük bir KURAL — aralığa düşen mevcut seansları kapatıyor ve
/// o aralıkta yeni seans üretilmesini engelliyor. Tek seans kapatmak ise bir
/// istisna. Aralık kaldırıldığında yalnız blackout'un kapattıkları geri açılıyor;
/// host'un elle kapattığı seans kapalı kalıyor (<see cref="SlotClosedReason"/>).</para>
///
/// <para>Çakışan aralıklara İZİN VAR — birleşim semantiği. Engellemek
/// <c>btree_gist</c> eklentisi isterdi ve repoda hiç eklenti yok; ayrıca çakışma
/// zararsız: iki kez "yokum" demek bir kez demekle aynı sonucu veriyor.</para>
/// </summary>
public sealed class AvailabilityBlackout : BaseAuditableEntity
{
    /// <summary>Host'un kendi notu ("tatil"). Misafire GİTMİYOR.</summary>
    public const int MaxNoteLength = 200;

    public required Guid ExperienceId { get; set; }

    /// <summary>Deneyimin saat diliminde, gün DAHİL.</summary>
    public required DateOnly StartsOnLocal { get; set; }

    /// <summary>
    /// Gün <b>DAHİL</b>. Yarı açık aralık (bitiş hariç) seçilmedi: host arayüzde
    /// "1-7 Ağustos yokum" yazıyor ve 7'yi hariç tutan bir model, her ekranda
    /// bir gün ekleyip çıkarmayı gerektirirdi — o aritmetiğin unutulduğu yer
    /// sessizce bir gün açık bırakır.
    /// </summary>
    public required DateOnly EndsOnLocal { get; set; }

    public string? Note { get; set; }

    /// <summary>Verilen yerel gün bu aralığa düşüyor mu (iki uç dahil).</summary>
    public bool Covers(DateOnly localDate)
        => localDate >= StartsOnLocal && localDate <= EndsOnLocal;
}
