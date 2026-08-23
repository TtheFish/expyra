using Expyra.Domain.Common;
using Expyra.Domain.Pricing;

namespace Expyra.Application.Features.Pricing;

/// <summary>
/// İlanın misafire görünen fiyatı.
///
/// <para><b>Tahsilat ve gösterim AYRI alanlarda</b> (PLAN Blok 7 kabul kriteri 3).
/// Tek bir <c>price</c> alanı olsaydı arayüzün "bu hangi para birimi" sorusunu her
/// çizim yerinde yeniden sorması gerekirdi ve bir gün yanlış cevaplanırdı. Buradaki
/// ayrım <c>Quote.Charge</c>/<c>Quote.Display</c> ayrımının tel üzerindeki
/// karşılığı.</para>
///
/// <para><see cref="ChargeCurrency"/> <b>daima dolu</b>: misafir EUR görse bile
/// ekranda tahsilatın hangi para biriminde yapılacağı yazmak zorunda.</para>
/// </summary>
/// <param name="FromAmountMinor">
/// Kişi başı yetişkin fiyatı — kartlardaki "şu tutardan başlayan". Yetişkin kademesi
/// zorunlu olduğu için (bkz. <c>SetPricingCommandValidator</c>) daima var.
/// </param>
public sealed record GuestPricingResponse(
    string ChargeCurrency,
    int ChargeMinorUnits,
    long FromAmountMinor,
    IReadOnlyList<GuestPriceLineResponse> Rules,
    GuestDisplayPriceResponse? Display);

/// <param name="DisplayUnitAmountMinor">
/// Aynı satırın gösterim parasındaki karşılığı; çevrim istenmemişse <c>null</c>.
/// Ayrı alan olması bilinçli: tahsilat tutarının üzerine yazılsaydı, çevrilmiş bir
/// sayı yanlışlıkla tahsilata girebilirdi.
/// </param>
public sealed record GuestPriceLineResponse(
    string GuestType,
    long UnitAmountMinor,
    long? DisplayUnitAmountMinor);

/// <param name="RateSnapshotId">
/// Kullanılan kur anlık görüntüsü. Yanıtta çünkü Blok 9 rezervasyona bunu yazacak:
/// "o an hangi kuru gösterdik" sorusunun cevabı tek bir kimlik.
/// </param>
/// <param name="CapturedAtUtc">
/// Kurun ÖLÇÜLDÜĞÜ an. Arayüz "kur şu tarihli, tahsilat host'un para biriminde"
/// notunu bununla yazıyor — bayat bir kuru sessizce güncel gibi göstermemek için.
/// </param>
public sealed record GuestDisplayPriceResponse(
    string Currency,
    int MinorUnits,
    long FromAmountMinor,
    Guid RateSnapshotId,
    DateTimeOffset CapturedAtUtc);

/// <summary>
/// Deneyimin fiyat satırları, bellekte. Sorgu sonucunu taşımak için; tel üzerine
/// çıkmıyor.
/// </summary>
internal sealed record PricingSnapshot(
    string ChargeCurrency,
    int ChargeMinorUnits,
    IReadOnlyDictionary<GuestType, Money> UnitPrices);
