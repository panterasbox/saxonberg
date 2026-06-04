/* Sandy the Shopkeeper */

inherit MonsterCode;

void extra_create()
{
    set_name("sandy");
    add_alias("Sandy");
    add_alias("shopkeeper");
	set_short("Sandy, the customer service agent");
    set_long("This is a short, dwarven woman in her younger middle ages.  She is\n" +
      "wearing a read uniform with the words 'Everything Inc.' across the back,\n" +
      "and a nametag on the front that has her name, 'Sandy', printed on it.\n" +
      "She smiles at you and says 'Need help finding anything?'\n");
    set_race("dwarf");
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

