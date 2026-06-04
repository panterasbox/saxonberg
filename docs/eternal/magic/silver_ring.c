// Death - 03/27/94
// Silver ring.  Based on the code from entesia's ring of strength but better
// in that it's only one object instead of two and cleaned up in other ways.
inherit ArmorCode;
inherit IdentifyCode;
inherit "/obj/armor/armor/special/base_ring";
object str;

void extra_create()
{
    set_name("silver ring");
    add_alias("ring");
    set_short("a silver ring");
    set_id_short("A ring of brilliance");
    set_id_long(
      "Wearing this ring will make you much smarter, but you will become weaker\n"+
      "and more frail.\n"
    );
    set_long(
      "This is a ring of finely crosshatched silver.  It sparkles with inner light.\n"+
      "Inside the ring are inscribed some magical runes which you cannot\n"+
      "decipher.\n"
    );
    set( RingP, 1 );
    set( MagicP, 1 );
    set( MetalP, 1 );
    set_weight(30);
    set_ac(0);
    set( NoTemperP, 1 );
    set( NoEnchantP, 1 );
set_value(4000);
}

wear_signal(object wearer)
{
if (::wear_signal(wearer))
	return 1;
    if (wearer->query_stat("str") < 10 || wearer->query_stat("con") < 10) {
	write("You are too frail to wear this ring.\n");
	return 1;
    }
    wearer->add_bonus_object(THISO);
	write("You wear the ring your head begins to swim.\n");
}

void remove_comm(object wearer)
{
    wearer->remove_bonus_object(THISO);
    write("You feel a vague sense of loss.\n");
}


query_stat_bonus(arg)
{
    if (arg=="int") return 10;
    if(arg=="str") return -5;
    if(arg=="con") return -5;
}
