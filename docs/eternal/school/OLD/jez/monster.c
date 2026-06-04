inherit MonsterCode;

void extra_create()
{
    set_name("newbie monster");
    set_short("Newbie Tester");
    set_long("This is the all purpose newbie tester.  It is a small " +
    "monster and looks fairly weak.");
    set_race("troll");
    set_max_damage(4);
    set_natural_ac(0);
    set_alignment("neutral");
    set_gender("male");
    set_stat("str", 7);
    set_stat("con", 4);
    set_stat("dex", 2);
    set_stat("wil", 1);
    set_stat("int", 9);
    set_stat("chr", 1);
}
