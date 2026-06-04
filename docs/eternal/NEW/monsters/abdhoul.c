/* Abdhoul the Slavemaster */

inherit MonsterCode;

void extra_create()
{
    set_name("abdhoul");
    add_alias("Abdhoul");
    add_alias("slavemaster");
    set_short("Abdhoul the slavemaster is whipping his slaves to attention here");
    set_long(
      "This is Abdhoul, a smelly, hairy, and generally unpleasant looking troll.\n" +
      "His yellow eyes stare at you unblinkingly, and he grunts, 'So what will ya\n" +
      "have today?,' and quickly turns around, whipping his slaves to attention.\n");
    set_race("troll");
    set_alignment(30);
    set_natural_ac(20);
    set_max_damage(30);
    set_type("blunt");
    set_max_hp(10000);
    set_max_fatigue(20000);
    set_stat("str", 100);
    set_stat("dex", 100);
    set_stat("int", 100);
    set_stat("wil", 100);
    set_stat("con", 100);
    set_stat("chr", 100);
    set_aggressive(0);
    set_heal_rate(30);
    set_heal_amount(100);
}

