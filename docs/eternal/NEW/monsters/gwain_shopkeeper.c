/* Gwain the Shopkeeper */

inherit MonsterCode;

void extra_create()
{
    set_name("gwain");
    add_alias("Gwain");
    add_alias("shopkeeper");
    set_short("Gwain, the owner of Paranoid Clothing & Apparel");
    set_long("Before you stands a short halfling man.  His eyes bug out "+
	"wildly as he notices you staring at him, and says, \"What!?  Why "+
	"are you staring at me!?\" and looks quickly away.  Then he says, "+
	"\"Oh!  By the way...  Let me know if you need anything.\"  Great "+
	"service here, eh?");
    set_race("halfling");
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

