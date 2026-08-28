namespace Expyra.Application.Common.Interfaces;

/// <summary>
/// E-posta gönderimi. Outbox tablosu YOK: Faz 1'in tek implementasyonu dosya+konsol
/// sink'i — ağa çıkmıyor, gizlenecek gecikmesi yok. Outbox + retry/backoff Faz 7.4'ün işi.
///
/// <para>Gönderim patlarsa istisna YUTULMAZ (CLAUDE.md #1): kullanıcı 500 alır ve
/// 'auth.email.failed' alarmı çalar.</para>
/// </summary>
public interface IEmailSender
{
    Task SendAsync(EmailMessage message, CancellationToken cancellationToken);
}

/// <param name="To">Kullanıcının yazdığı hâl — normalize edilmiş adres değil.</param>
/// <param name="Body">
/// Düz metin. HTML şablon Faz 7.4/8.1; bugün gövdeyi tek yerde tutmak, o dilimde
/// sökülecek metin borcunu tek dosyada bırakıyor.
/// </param>
public sealed record EmailMessage(string To, string Subject, string Body);
