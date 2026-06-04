/* +5 int obj 25OCT92 -4D */

inherit ObjectCode;
int held = 0;
object player;

int query_held() { return (held); }

void extra_create()
{
    set("id","blue diamond");
    add("id","blue");
    add("id","diamond");
    set("short","a blue diamond");
    set("long",
       "Looking into the heart of this rare gem, you see a pale blue light "+
       "glowing. One might hold the diamond...\n");
    set("value", 2000);
    set("weight", 50);
}
void extra_init() {
    add_action("hold","hold");
    add_action("give","give");
    add_action("give","put");
}

int query_stat_bonus(string arg) {
   if (arg != "int") return 0;
   if (environment(THISO) != player) return 0;
   if (held) return 5;
}

status hold(string arg) {
    if (!id(arg)) return 0;
    held = 1;
    player = THISP;
    player->add_bonus_object(THISO);
    write ("As you hold the diamond in your hand it glows more brightly.\n");
    write ("You feel smarter!\n");
    say (PNAME+" holds a blue diamond.\n");
    return 1;
}
status give(string arg) {
   if (!id(arg)) return 0;
   drop();
}
status drop() {
   if (!held) return 0;
   held = 0;
   player->remove_bonus_object(THISO);
   write ("You feel a good bit less intelligent.\n");
   return 0;
}
string short() {
   if (environment(THISO) != player) held = 0;
   if (!held) return "a blue diamond";
   if (held) return "a blue diamond (held)";
}
