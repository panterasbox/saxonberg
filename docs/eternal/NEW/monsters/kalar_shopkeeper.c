/* Kalar the Shopkeeper */

inherit MonsterCode;

void extra_create()
{
    set_name("kalar");
    add_alias("Kalar");
    add_alias("shopkeeper");
	set_short("Kalar, the self-proclaimed anarchist");
    set_long(
      "Here stands Kalar, a mild mannered imp which endorses anarchy on all planes,\n" +
      "dimensions, and worlds of the multiverse.  He grins at you in mock respect,\n" +
      "baring his mouthful of tiny, needle-sharp teeth in the process.  Noticing\n" +
      "that you don't appear the least bit impressed, he stops smiling, and shrugs,\n" +
      "muttering, 'It never works anymore... *sigh*'\n");
    set_race("imp");
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
    add_prop( NoCharmP );
}

