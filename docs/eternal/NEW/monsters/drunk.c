/* Sick Drunk */

inherit MonsterCode;
inherit MonsterTalk;

void extra_create()
{
    set_name("drunk");
    set_short("a pale-faced drunk is standing here");
    set_long("What a sorry sight, this guy is so drunk that he has gone blind!\n" +
      "A gurgling sound comes from his dry lips as he doubles over for the\n" +
      "umpteenth time to vomit against the alley wall.  Obviously, he doesn't\n" +
      "notice your stare, he's blind!\n");
    set_race("orc");
    set_alignment(20);
    set_natural_ac(1);
    set_max_damage(3);
    set_type("blunt");
    set_max_hp(35);
    set_max_fatigue(50);
    set_stat("str", 7);
    set_stat("dex", 7);
    set_stat("int", 7);
    set_stat("wil", 7);
    set_stat("con", 7);
    set_stat("chr", 7);
    set_aggressive(0);
    set_chat_chance(25);
    set_chat_rate(40);
    add_phrase("Drunk doubles over and pukes.\n");
    add_phrase("Drunk vomits all over himself!\n");
    add_phrase("Drunk vomits all over you!\n");
    set_heal_rate(30);
    set_heal_amount(1);
    add_money(random(10)+5);
}
