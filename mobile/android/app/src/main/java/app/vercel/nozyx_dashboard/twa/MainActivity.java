package app.vercel.nozyx_dashboard.twa;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.graphics.Color;
import android.media.AudioAttributes;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        criarCanalRecorde();
    }

    // Canal "Recordes" com o som de conquista (res/raw/recorde.mp3). O som de um canal não muda depois de criado.
    private void criarCanalRecorde() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager nm = getSystemService(NotificationManager.class);
        if (nm == null || nm.getNotificationChannel("recorde") != null) return;
        NotificationChannel ch = new NotificationChannel("recorde", "Recordes", NotificationManager.IMPORTANCE_HIGH);
        ch.setDescription("Quando a Nozyx bate o melhor dia ou o melhor mês");
        ch.enableLights(true);
        ch.setLightColor(Color.parseColor("#FFD166"));
        ch.enableVibration(true);
        Uri som = Uri.parse("android.resource://" + getPackageName() + "/" + R.raw.recorde);
        AudioAttributes aa = new AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_NOTIFICATION)
            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
            .build();
        ch.setSound(som, aa);
        nm.createNotificationChannel(ch);
    }
}
