/*
**  Tailor (Ten Second Tailors)
*/
 
inherit MonsterCode;
 
void extra_create()
{
    set_name("quickfingers");
    add_alias("quickfinger");
    add_alias("halfling");
    add_alias("tailor");
    set_short("Quickfingers, the tailor, stands here waiting for a customer");
    set_long(
      "Before you stands a short, skinny halfling.  Oddly enough, the definition\n" +
      "in his muscles stands out as the most intriguing feature of the fellow;\n" +
      "thin, but hard.  Noticing your stare, he smiles and silently hopes that\n" +
      "you will request some of his services.\n"
    );
    set_race("halfling");
    set_max_damage(20);
    set_natural_ac(20);
    set_alignment("good");
    set_hit_bonus(3);
    set_damage_bonus(3);
    set_max_hp(5000);
    set_max_fatigue(5000);
    set_max_mana(5000);
    set_gender("male");
    set_stat("str", 100);
    set_stat("con", 100);
    set_stat("wil", 100);
    set_stat("int", 100);
    set_stat("dex", 100);
    set_stat("chr", 100);
    set_offensive_level(100);
    set_defensive_level(100);
    add_combat_message("bash", "bashes");
}
