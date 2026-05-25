/*
**  Receptionist (Bed & Breakfast Inn)
*/
 
inherit MonsterCode;
 
void extra_create()
{
    set_name("viola");
  add_prop( NoPKP );
    add_alias("receptionist");
    set_short("Viola, the receptionist, is sitting here behind the large desk");
    set_long(
      "Imagine the most toad-ugly dwarf you've ever seen and multiply that by " +
      "ten.  What you get is Viola.  Unfortunately, her looks betray her true " +
      "personality, as she really is a nice person once you get to know her.  " +
      "Anyway, as she notices you gagging, she politely looks the other way, " +
      "waiting for you to request some service of her."
    );
    set_race("dwarf");
    set_max_damage(20);
    set_natural_ac(20);
    set_alignment("good");
    set_hit_bonus(3);
    set_damage_bonus(3);
    set_max_hp(5000);
    set_max_fatigue(5000);
    set_max_mana(5000);
    set_gender("female");
    set_stat("str", 100);
    set_stat("con", 100);
    set_stat("wil", 100);
    set_stat("int", 100);
    set_stat("dex", 100);
    set_stat("chr", 100);
    set_offensive_level(100);
    set_defensive_level(100);
    add_combat_message("cast your ugly gaze at", "casts her ugly gaze at");
    add_prop( NoCharmP );
}
