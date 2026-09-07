package com.elm.practice.common;

import com.elm.practice.mapper.IdSequenceMapper;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/** 应用侧全局 ID 序列（prefix + 自增值），事务内 SELECT ... FOR UPDATE 行锁替代原 AtomicLong。 */
@Component
public class IdGenerator {
    private final IdSequenceMapper sequences;
    public IdGenerator(IdSequenceMapper sequences) { this.sequences = sequences; }

    @Transactional
    public String nextId(String prefix) {
        Long current = sequences.currentForUpdate();
        sequences.advance();
        return prefix + current;
    }
}
