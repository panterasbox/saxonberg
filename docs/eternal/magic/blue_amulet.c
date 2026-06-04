
// Raises max_mana by 100 points and stores mana

inherit "/obj/armor/armor/special/base_amulet";
inherit IdentifyCode;

object	shadobj, player;
int	stored_mana, worn;
#define BONUS 100
#define SHADOW_OB "/zone/null/eternal/magic/blue_amulet_shadow"

void extra_create()
{
    set_name("amulet");
    add_alias("blue");
    add_alias("blue amulet");
    add_alias("amulet");
    set_short("a blue amulet");
    set( MagicP, 1 );
    set_long(
      "This amulet is a silver lace sphere enclosing a brilliant blue gem.\n"+
      "The topaz sparkles with an inner light.\n"
    );
    set_value(3000);
    set_weight(5);
    set_id_long(
      "This amulet when worn increases the wearer's ability to hold mana. It \n"+
      "also holds a charge of mana if there is any stored in it.\n"
    );
    set_id_short("a mana store amulet");
}

wear_comm(wearer)
{

    if (catch (shadobj = clone_object(SHADOW_OB)))
    {
	write("There was an error with the amulet shadow.  Doh!\n");
	write("The amulet disappears in a puff of logic!\n");
	destruct(THISO);
	return;
    }

    shadobj->set_up_effect(wearer,THISO);
    player=wearer;
    worn=1;
}

remove_comm(wearer)
{
    if(!shadobj)
    {
	write("You have no effects shadow! Strange...\n");
    }
    else 
    {
	shadobj->remove_effect();
    }
    check_mana();
    player=0;
    worn=0;
}


query_stored_mana()
{
    return stored_mana;
}

add_stored_mana(int amt)
{
    int x, y;

    if (amt > 0) {
	x = BONUS - stored_mana;
	y = (x > amt)?amt:x;
	stored_mana += y;
	return y;
    }

    if (amt < 0) {
	x = stored_mana + amt;
	y = (x < 0)?-stored_mana:amt;
	stored_mana += y;
	return y;
    }

    return;

}

short() {
    string xstr;
    check_mana();
    xstr = (stored_mana >  BONUS/2)?"a glowing blue amulet":"a clear blue amulet";
    if(worn) xstr=xstr+" (worn)";
    return xstr;
}

destruct_signal() {
    if (shadobj) catch(shadobj->remove_effect());
}

query_bonus() { return BONUS; }

check_mana() {
    if (!shadobj) return;
    shadobj->mana_check();
    return;
}
